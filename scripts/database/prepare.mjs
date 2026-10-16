import { DatabaseSync } from "node:sqlite";
import {
  readFile,
  readdir,
  writeFile,
  mkdir,
  chmod,
  stat,
} from "node:fs/promises";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import {
  models,
  encode,
  decode,
  sqlValue,
} from "../../api/build/record-codec.mjs";
const argv = process.argv.slice(2);
function option(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}
const source = option("--sql"),
  files = option("--files");
if (!source || !files)
  throw new Error(
    "Usage: bun run db:prepare --sql /absolute/backup.sql --files /absolute/rms-private [--out api/.local/prepared-TIMESTAMP]",
  );
const root = resolve(import.meta.dirname, "../..");
const out = resolve(
  option("--out") ||
    resolve(
      root,
      "api/.local/prepared-" + new Date().toISOString().replaceAll(":", "-"),
    ),
);
const privateRoot = resolve(root, "api/.local") + sep;
if (!out.startsWith(privateRoot))
  throw new Error(
    "Output must be inside ignored api/.local; original backups are never overwritten.",
  );
await mkdir(out, { recursive: false, mode: 0o700 });
const bytes = await readFile(source),
  sourceHash = createHash("sha256").update(bytes).digest("hex");
const dbPath = resolve(out, "rms-normalized.sqlite"),
  db = new DatabaseSync(dbPath);
await chmod(dbPath, 0o600);
try {
  db.exec(bytes.toString("utf8"));
  assert.equal(
    db.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  const originalTables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all()
    .map((r) => r.name);
  const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
  const originalRows = Object.fromEntries(
    originalTables.map((table) => [
      table,
      db.prepare("SELECT * FROM " + quote(table)).all(),
    ]),
  );
  const snapshot = db
    .prepare("SELECT version,data,updated_at FROM app_state WHERE id=1")
    .get();
  if (!snapshot) throw new Error("Missing source app_state");
  const state = JSON.parse(snapshot.data);
  let totalBytes = 0;
  for (const file of originalRows.files) {
    const objectPath = resolve(files, file.object_key),
      path = relative(resolve(files), objectPath);
    if (path.startsWith(".." + sep) || path === ".." || isAbsolute(path))
      throw new Error("Invalid R2 object path");
    const info = await stat(objectPath);
    assert.equal(info.isFile(), true);
    assert.equal(
      info.size,
      file.size,
      "R2 size mismatch for file ID " + file.id,
    );
    totalBytes += info.size;
  }
  if (originalTables.some((table) => table.startsWith("rms_")))
    throw new Error(
      "Backup already contains normalized tables. Do not rebuild from its archived app_state; restore the normalized backup directly.",
    );
  const migrationDir = resolve(root, "api/prisma/migrations"),
    migrations = [];
  for (const entry of (await readdir(migrationDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const sql = await readFile(
      resolve(migrationDir, entry.name, "migration.sql"),
      "utf8",
    );
    const statements = sql
      .replace(/--[^\n]*/g, "")
      .split(";")
      .filter((s) => s.trim());
    if (
      statements.some(
        (s) =>
          !/^\s*(CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)|ALTER\s+TABLE)\s+"rms_[a-zA-Z0-9_]+"/i.test(
            s,
          ),
      ) ||
      /\b(DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|TRUNCATE)\b/i.test(sql)
    )
      throw new Error("Migration requires manual review: " + entry.name);
    migrations.push({
      name: entry.name,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex"),
    });
  }
  const encoded = await encode(state);
  // Fail before any activation if a field, type, duplicate, or ordering differs.
  assert.deepEqual(
    decode(encoded.records, encoded.root, encoded.rootShape),
    state,
  );
  const sqlLiteral = (value) =>
    value === null
      ? "NULL"
      : typeof value === "number"
        ? String(value)
        : "'" + String(value).replaceAll("'", "''") + "'";
  const inserts = [];
  const add = (table, row, types = {}) => {
    const fields = Object.keys(row);
    inserts.push(
      `INSERT INTO ${quote(table)} (${fields.map(quote).join(",")}) VALUES (${fields.map((f) => sqlLiteral(sqlValue(row[f], types[f]))).join(",")});`,
    );
  };
  for (const model of models)
    for (const row of encoded.records[model.name])
      add(model.table, row, model.fields);
  for (const [key, value] of Object.entries(encoded.root))
    add("rms_root_fields", { key, value }, { value: "Json" });
  for (const migration of migrations)
    add("rms_migration_history", {
      name: migration.name,
      checksum: migration.checksum,
      appliedAt: new Date().toISOString(),
    });
  // Last row is the activation marker; loading data alone never changes legacy storage.
  add(
    "rms_storage_meta",
    {
      id: 1,
      version: snapshot.version,
      format: 1,
      updatedAt: snapshot.updated_at,
      sourceHash,
      writeToken: crypto.randomUUID(),
      rootShape: encoded.rootShape,
    },
    { rootShape: "Json" },
  );
  db.exec("PRAGMA foreign_keys=ON");
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const migration of migrations) db.exec(migration.sql);
    for (const sql of inserts) db.exec(sql);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  const actual = Object.fromEntries(
    models.map((m) => [
      m.name,
      db.prepare("SELECT * FROM " + quote(m.table)).all(),
    ]),
  );
  const decoded = decode(
    actual,
    Object.fromEntries(
      db
        .prepare("SELECT * FROM rms_root_fields")
        .all()
        .map((r) => [r.key, JSON.parse(r.value)]),
    ),
    JSON.parse(
      db.prepare("SELECT rootShape FROM rms_storage_meta").get().rootShape,
    ),
  );
  assert.deepEqual(decoded, state);
  for (const table of originalTables)
    assert.deepEqual(
      db.prepare("SELECT * FROM " + quote(table)).all(),
      originalRows[table],
      "Legacy table changed: " + table,
    );
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    db.prepare("PRAGMA integrity_check").get().integrity_check,
    "ok",
  );
  const totals = (data) => ({
    originalContract: data.projects.reduce(
      (s, p) => s + (Number(p.originalContract) || 0),
      0,
    ),
    payment: data.projects
      .flatMap((p) => p.transactions || [])
      .reduce((s, t) => s + (Number(t.amount) || 0), 0),
    verifiedPayment: data.projects
      .flatMap((p) => p.transactions || [])
      .filter((t) => t.status === "VERIFIED")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0),
  });
  assert.deepEqual(totals(decoded), totals(state));
  const report = {
    status: "VERIFIED_LOCAL_ONLY",
    createdAt: new Date().toISOString(),
    sourceHash,
    sourceVersion: snapshot.version,
    sourceBytes: bytes.length,
    legacyTablesPreserved: originalTables.length,
    models: models.length,
    counts: Object.fromEntries(
      models.map((m) => [m.name, actual[m.name].length]),
    ),
    r2: {
      matchedFiles: originalRows.files.length,
      matchedBytes: totalBytes,
      verification:
        "local existence + SQL metadata size; not a remote checksum comparison",
    },
    financialTotals: totals(decoded),
    checks: {
      exactRoundTrip: true,
      legacyRowsUnchanged: true,
      foreignKeys: true,
      sqliteIntegrity: true,
    },
    productionModified: false,
  };
  await writeFile(
    resolve(out, "verification.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600 },
  );
  // Sensitive migration data stays in ignored local storage. Never include in a frontend ZIP.
  await writeFile(
    resolve(out, "normalized-data.sql"),
    inserts.join("\n") + "\n",
    { mode: 0o600 },
  );
  await writeFile(
    resolve(root, "api/.local/current.json"),
    JSON.stringify(
      { database: dbPath, directory: out, files: resolve(files), sourceHash },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        directory: out,
        sourceVersion: snapshot.version,
        models: models.length,
        records: Object.values(actual).reduce((n, a) => n + a.length, 0),
        r2Files: originalRows.files.length,
        exactRoundTrip: true,
        legacyTablesPreserved: true,
        productionModified: false,
      },
      null,
      2,
    ),
  );
} finally {
  db.close();
}
