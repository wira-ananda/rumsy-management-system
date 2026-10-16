import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { models, decode, canonical } from "../../api/build/record-codec.mjs";
import { root, stageDir, query } from "./staging-cli.mjs";
const source = JSON.parse(
  await readFile(resolve(stageDir, "source.json"), "utf8"),
);
const local = new DatabaseSync(source.prepared, { readOnly: true });
try {
  const queries = models.map((m) => ({
    key: m.name,
    sql: 'SELECT * FROM "' + m.table + '"',
  }));
  queries.push(
    { key: "meta", sql: "SELECT * FROM rms_storage_meta WHERE id=1" },
    { key: "root", sql: "SELECT * FROM rms_root_fields" },
    ...[
      "users",
      "files",
      "server_audit",
      "projects",
      "contracts",
      "project_members",
      "project_documents",
      "transactions",
    ].map((table) => ({ key: table, sql: 'SELECT * FROM "' + table + '"' })),
    { key: "sessions", sql: "SELECT COUNT(*) AS n FROM sessions" },
    { key: "foreignKeys", sql: "PRAGMA foreign_key_check" },
  );
  const remote = {};
  for (let offset = 0; offset < queries.length; offset += 8) {
    const batch = queries.slice(offset, offset + 8),
      results = await query(batch.map((q) => q.sql).join(";"));
    assert.equal(results.length, batch.length);
    results.forEach((r, i) => {
      assert.equal(r.success, true);
      remote[batch[i].key] = r.results;
    });
  }
  const records = Object.fromEntries(
      models.map((m) => [m.name, remote[m.name]]),
    ),
    meta = remote.meta[0];
  const state = decode(
    records,
    Object.fromEntries(remote.root.map((r) => [r.key, JSON.parse(r.value)])),
    JSON.parse(meta.rootShape),
  );
  const original = JSON.parse(
    local.prepare("SELECT data FROM app_state WHERE id=1").get().data,
  );
  assert.deepEqual(state, original);
  assert.ok(
    meta.version >= source.sourceVersion,
    "State version must not go backwards",
  );
  assert.equal(meta.sourceHash, source.sourceHash);
  for (const table of [
    "users",
    "files",
    "server_audit",
    "projects",
    "contracts",
    "project_members",
    "project_documents",
    "transactions",
  ]) {
    const expected = local.prepare('SELECT * FROM "' + table + '"').all();
    assert.deepEqual(
      remote[table].map(canonical).sort(),
      expected.map(canonical).sort(),
      "Table mismatch: " + table,
    );
  }
  assert.equal(remote.sessions[0].n, 0);
  assert.deepEqual(remote.foreignKeys, []);
  const report = {
    status: "STAGING_D1_VERIFIED",
    database: "rms-rumsy-staging",
    uuid: "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
    checkedAt: new Date().toISOString(),
    sourceVersion: source.sourceVersion,
    currentVersion: meta.version,
    sourceHash: source.sourceHash,
    exactBusinessData: true,
    models: models.length,
    records: models.reduce((n, m) => n + records[m.name].length, 0),
    users: remote.users.length,
    files: remote.files.length,
    counts: Object.fromEntries(
      models.map((m) => [m.name, records[m.name].length]),
    ),
    sessionsCleared: true,
    foreignKeys: true,
    productionModified: false,
  };
  await writeFile(
    resolve(stageDir, "database-verification.json"),
    JSON.stringify(report, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify(
      {
        status: report.status,
        records: report.records,
        users: report.users,
        files: report.files,
        exactBusinessData: true,
        productionModified: false,
      },
      null,
      2,
    ),
  );
} finally {
  local.close();
}
