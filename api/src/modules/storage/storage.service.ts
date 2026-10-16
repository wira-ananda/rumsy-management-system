import type { Bindings } from "../../shared/env";
import { prisma } from "../../shared/db/prisma";
import {
  models,
  encode,
  decode,
  canonical,
  sqlValue,
  type Row,
  type Records,
} from "./record-codec";
// Explicit opt-in prevents a new deployment switching an unverified production DB.
export function normalized(env: Bindings) {
  if (!env.RMS_STORAGE || env.RMS_STORAGE === "legacy") return false;
  if (env.RMS_STORAGE === "normalized") return true;
  throw new Error("Invalid RMS_STORAGE configuration");
}
export async function readNormalized(env: Bindings) {
  const db = prisma(env);
  for (let attempt = 0; attempt < 3; attempt++) {
    const meta = await db.storageMeta.findUnique({ where: { id: 1 } });
    if (!meta || meta.format !== 1)
      throw new Error(
        "Normalized storage has not been migrated and verified. Keep RMS_STORAGE=legacy until cutover.",
      );
    const records: Records = {};
    await Promise.all(
      models.map(async (model) => {
        records[model.name] = await (db as any)[model.delegate].findMany();
      }),
    );
    const fields = await db.rootField.findMany();
    const after = await db.storageMeta.findUnique({ where: { id: 1 } });
    if (
      after?.version === meta.version &&
      after?.writeToken === meta.writeToken
    ) {
      const data = decode(
        records,
        Object.fromEntries(fields.map((r) => [r.key, r.value])),
        meta.rootShape as Row,
      );
      return {
        version: meta.version,
        updated_at: meta.updatedAt,
        data,
        records,
        rootShape: meta.rootShape,
        writeToken: meta.writeToken,
      };
    }
  }
  throw new Error("Storage changed during read; retry the request.");
}
const quoted = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export async function saveNormalized(
  env: Bindings,
  previous: Awaited<ReturnType<typeof readNormalized>>,
  data: Row,
) {
  const next = await encode(data),
    writeToken = crypto.randomUUID(),
    updatedAt = new Date().toISOString();
  const guard =
    "EXISTS(SELECT 1 FROM rms_storage_meta WHERE id=1 AND writeToken=?)";
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "UPDATE rms_storage_meta SET version=version+1,updatedAt=?,writeToken=?,rootShape=? WHERE id=1 AND version=? AND writeToken=?",
    ).bind(
      updatedAt,
      writeToken,
      JSON.stringify(next.rootShape),
      previous.version,
      previous.writeToken,
    ),
  ];
  // Child deletions precede parents. All changes share one D1 atomic batch and CAS guard.
  for (const model of [...models].reverse()) {
    const keep = new Set(next.records[model.name].map((row) => row.storageKey));
    for (const row of previous.records[model.name])
      if (!keep.has(row.storageKey))
        statements.push(
          env.DB.prepare(
            `DELETE FROM ${quoted(model.table)} WHERE storageKey=? AND ${guard}`,
          ).bind(row.storageKey, writeToken),
        );
  }
  for (const model of models) {
    const old = new Map(
      previous.records[model.name].map((row) => [row.storageKey, row]),
    );
    for (const row of next.records[model.name]) {
      if (
        old.has(row.storageKey) &&
        canonical(old.get(row.storageKey)) === canonical(row)
      )
        continue;
      const fields = Object.keys(row),
        columns = fields.map(quoted).join(","),
        updates = fields
          .filter((f) => f !== "storageKey")
          .map((f) => `${quoted(f)}=excluded.${quoted(f)}`)
          .join(",");
      statements.push(
        env.DB.prepare(
          `INSERT INTO ${quoted(model.table)} (${columns}) SELECT ${fields.map(() => "?").join(",")} WHERE ${guard} ON CONFLICT(storageKey) DO UPDATE SET ${updates}`,
        ).bind(
          ...fields.map((f) => sqlValue(row[f], model.fields[f])),
          writeToken,
        ),
      );
    }
  }
  const root = Object.fromEntries(
    (await prisma(env).rootField.findMany()).map((r) => [r.key, r.value]),
  );
  for (const key of Object.keys(root))
    if (!(key in next.root))
      statements.push(
        env.DB.prepare(
          `DELETE FROM rms_root_fields WHERE key=? AND ${guard}`,
        ).bind(key, writeToken),
      );
  for (const [key, value] of Object.entries(next.root))
    if (canonical(value) !== canonical(root[key]))
      statements.push(
        env.DB.prepare(
          `INSERT INTO rms_root_fields(key,value) SELECT ?,? WHERE ${guard} ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        ).bind(key, JSON.stringify(value), writeToken),
      );
  const result = await env.DB.batch(statements);
  return result[0].meta.changes
    ? { version: previous.version + 1, changedRows: statements.length - 1 }
    : null;
}
export async function normalizedPortalProject(env: Bindings, token: string) {
  const db = prisma(env);
  const portal = await db.projectPortal.findFirst({
    where: { token, enabled: true },
  });
  if (!portal) return undefined;
  const records: Records = Object.fromEntries(models.map((m) => [m.name, []]));
  const project = await db.project.findUnique({
    where: { storageKey: portal.parentKey },
  });
  if (!project) return undefined;
  records.Project = [project];
  for (const model of models.filter((m) => m.parent === "Project"))
    records[model.name] = await (db as any)[model.delegate].findMany({
      where: { parentKey: project.storageKey },
    });
  for (const [parent, child] of [
    ["DailyReport", "DailyPhoto"],
    ["WeeklyReport", "WeeklyPhoto"],
  ]) {
    const keys = records[parent].map((r) => r.storageKey),
      model = models.find((m) => m.name === child)!;
    records[child] = [];
    for (let offset = 0; offset < keys.length; offset += 80)
      records[child].push(
        ...(await (db as any)[model.delegate].findMany({
          where: { parentKey: { in: keys.slice(offset, offset + 80) } },
        })),
      );
  }
  return decode(records, {}, { projects: "array" }).projects[0];
}
