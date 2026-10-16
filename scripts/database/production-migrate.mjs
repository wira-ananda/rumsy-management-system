// One-time, additive production migration. Requires the explicit write pause.
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { query, save, evidence, root } from "./cutover-cloud.mjs";
import { models, decode, canonical } from "../../api/build/record-codec.mjs";
import { unstable_splitSqlQuery } from "../../api/node_modules/wrangler/wrangler-dist/cli.js";
const id = "37aa92aa-d270-4928-89ea-ca949268ac36";
const backup = await readFile(resolve(evidence, "production-final.sql"));
const reference = new DatabaseSync(":memory:");
reference.exec(backup.toString("utf8"));
const original = reference.prepare("SELECT * FROM app_state WHERE id=1").get();
const current = JSON.parse(
  await readFile(resolve(root, "api/.local/current.json"), "utf8"),
);
const report = JSON.parse(
  await readFile(resolve(current.directory, "verification.json"), "utf8"),
);
assert.equal(
  report.sourceHash,
  createHash("sha256").update(backup).digest("hex"),
);
assert.equal(report.sourceVersion, original.version);
const tables = reference
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  )
  .all()
  .map((t) => t.name);
assert.ok(
  !tables.some((t) => t.startsWith("rms_")),
  "Final source must be unmigrated",
);
const originalRows = Object.fromEntries(
  tables.map((t) => [t, reference.prepare('SELECT * FROM "' + t + '"').all()]),
);
async function readTables(names) {
  const rows = {};
  for (let offset = 0; offset < names.length; offset += 8) {
    const batch = names.slice(offset, offset + 8);
    const results = await query(
      id,
      batch.map((t) => 'SELECT * FROM "' + t + '"').join(";"),
    );
    batch.forEach((t, i) => {
      assert.ok(results[i].success);
      rows[t] = results[i].results;
    });
  }
  return rows;
}
function compareLegacy(actual) {
  let expiredSessionsCleaned = 0;
  for (const t of tables) {
    let expected = originalRows[t];
    if (t === "sessions") {
      const actualIds = new Set(actual[t].map((r) => r.id));
      const removed = expected.filter((r) => !actualIds.has(r.id));
      assert.ok(
        removed.every((r) => Date.parse(r.expires_at) <= Date.now()),
        "An unexpired source session is missing",
      );
      expiredSessionsCleaned = removed.length;
      expected = expected.filter((r) => actualIds.has(r.id));
    }
    assert.ok(
      canonical(actual[t].map(canonical).sort()) ===
        canonical(expected.map(canonical).sort()),
      "Legacy data rows changed: " + t,
    );
  }
  return expiredSessionsCleaned;
}
if (process.argv[2] === "apply") {
  assert.equal(
    JSON.parse(
      await readFile(resolve(evidence, "freeze-confirmed.json"), "utf8"),
    ).stateUnchanged,
    true,
  );
  const health = await fetch("https://rms-rumsy-app.pages.dev/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(health.status, 503);
  compareLegacy(await readTables(tables));
  const present = (
    await query(
      id,
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rms_%'",
    )
  )[0].results;
  assert.equal(
    present.length,
    0,
    "Refusing to import over existing normalized tables",
  );
  const schema = await readFile(
    resolve(
      root,
      "api/prisma/migrations/202610160001_normalized_storage/migration.sql",
    ),
    "utf8",
  );
  // Foreign-key declarations contain ON DELETE; reject destructive statements,
  // not the referential-integrity clause inside CREATE TABLE.
  assert.ok(
    !/(?:^|;)\s*(DROP|DELETE|TRUNCATE)\b/i.test(
      schema.replace(/--[^\n]*/g, ""),
    ),
  );
  await query(id, schema);
  // SQL literals may contain literal blank lines. Never split/filter by line.
  const statements = unstable_splitSqlQuery(
    await readFile(resolve(current.directory, "normalized-data.sql"), "utf8"),
  );
  // Keep each D1 request bounded and put the activation marker last.
  assert.ok(
    statements.at(-1).trimStart().startsWith('INSERT INTO "rms_storage_meta"'),
  );
  let batch = [],
    bytes = 0,
    count = 0;
  async function flush() {
    if (!batch.length) return;
    await query(id, batch.join("\n"));
    count += batch.length;
    batch = [];
    bytes = 0;
    if (count % 200 < 40)
      console.log(
        "Imported normalized statements: " + count + "/" + statements.length,
      );
  }
  for (const statement of statements) {
    assert.ok(Buffer.byteLength(statement) < 90000, "D1 statement too large");
    if (batch.length >= 40 || bytes + Buffer.byteLength(statement) > 90000)
      await flush();
    batch.push(statement);
    bytes += Buffer.byteLength(statement);
  }
  await flush();
  await save("production-import.json", {
    at: new Date().toISOString(),
    statements: count,
    sourceHash: report.sourceHash,
  });
}
if (process.argv[2] === "repair-unpublished") {
  const health = await fetch("https://rms-rumsy-app.pages.dev/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(
    health.status,
    503,
    "Refusing repair unless main production is paused",
  );
  const marker = (
    await query(
      id,
      "SELECT version,sourceHash FROM rms_storage_meta WHERE id=1",
    )
  )[0].results[0];
  assert.equal(
    marker.version,
    original.version,
    "Refusing repair after any normalized save",
  );
  assert.equal(marker.sourceHash, report.sourceHash);
  const expected = new DatabaseSync(current.database, { readOnly: true });
  const actual = await readTables(models.map((m) => m.table));
  const repairs = [];
  try {
    for (const model of models) {
      const wanted = expected
        .prepare('SELECT * FROM "' + model.table + '"')
        .all();
      assert.equal(actual[model.table].length, wanted.length);
      const indexed = new Map(
        actual[model.table].map((r) => [r.storageKey, r]),
      );
      for (const row of wanted) {
        const remote = indexed.get(row.storageKey);
        assert.ok(remote, "Missing storage key");
        const fields = Object.keys(row).filter(
          (f) => canonical(row[f]) !== canonical(remote[f]),
        );
        if (fields.length) {
          // Bound parameters preserve whitespace exactly, including blank lines.
          await query(
            id,
            'UPDATE "' +
              model.table +
              '" SET ' +
              fields.map((f) => '"' + f + '"=?').join(",") +
              " WHERE storageKey=?",
            [...fields.map((f) => row[f]), row.storageKey],
          );
          repairs.push({
            model: model.name,
            storageKey: row.storageKey,
            fields,
          });
        }
      }
    }
    await save("unpublished-import-repairs.json", {
      checkedAt: new Date().toISOString(),
      repairs,
    });
    console.log(
      "Corrected unpublished normalized rows using bound parameters: " +
        repairs.length,
    );
  } finally {
    expected.close();
  }
}
if (["apply", "verify", "repair-unpublished"].includes(process.argv[2])) {
  const names = [
    ...new Set([
      ...tables,
      ...models.map((m) => m.table),
      "rms_root_fields",
      "rms_storage_meta",
    ]),
  ];
  const rows = await readTables(names);
  const expiredSessionsCleaned = compareLegacy(rows);
  const state = decode(
    Object.fromEntries(models.map((m) => [m.name, rows[m.table]])),
    Object.fromEntries(
      rows.rms_root_fields.map((r) => [r.key, JSON.parse(r.value)]),
    ),
    JSON.parse(rows.rms_storage_meta[0].rootShape),
  );
  assert.ok(
    canonical(state) === canonical(JSON.parse(original.data)),
    "Normalized data differs from final source; activation blocked",
  );
  assert.equal(rows.rms_storage_meta[0].sourceHash, report.sourceHash);
  assert.ok(
    rows.rms_storage_meta[0].version >= original.version,
    "State version must not go backwards",
  );
  assert.deepEqual(
    (await query(id, "PRAGMA foreign_key_check"))[0].results,
    [],
  );
  const verification = {
    checkedAt: new Date().toISOString(),
    database: "rms-rumsy",
    exactBusinessData: true,
    legacyDataRowsUnchanged: true,
    activeSessionsPreserved: true,
    expiredSessionsCleaned,
    sourceVersion: original.version,
    currentVersion: rows.rms_storage_meta[0].version,
    sourceHash: report.sourceHash,
    models: models.length,
    records: models.reduce((s, m) => s + rows[m.table].length, 0),
    users: rows.users.length,
    files: rows.files.length,
    counts: report.counts,
    financialTotals: report.financialTotals,
    foreignKeys: true,
  };
  await save("production-normalized-verified.json", verification);
  await save("production-rows-migrated.json", rows);
  for (const [label, maintenance] of [
    ["prod-normalized-maint", "1"],
    ["prod-canary", "0"],
    ["prod-live", "0"],
  ]) {
    const config = JSON.parse(
      await readFile(resolve(evidence, "prod-maint/wrangler.jsonc"), "utf8"),
    );
    config.vars.RMS_STORAGE = "normalized";
    config.vars.RMS_MAINTENANCE = maintenance;
    const { mkdir } = await import("node:fs/promises");
    await mkdir(resolve(evidence, label), { recursive: true, mode: 0o700 });
    await save(label + "/wrangler.jsonc", config);
  }
  console.log(JSON.stringify(verification, null, 2));
}
reference.close();
