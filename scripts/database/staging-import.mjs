import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  root,
  stageDir,
  stageDatabase,
  wrangler,
  query,
} from "./staging-cli.mjs";
const source = JSON.parse(
  await readFile(resolve(stageDir, "source.json"), "utf8"),
);
const info = await wrangler(["d1", "info", stageDatabase, "--json"], {
  json: true,
});
assert.equal(info.uuid, "b1cb3744-7d94-453c-8b3c-e23bc407abdf");
const tables = (
  await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  )
)[0].results.map((r) => r.name);
async function ingest(label, file) {
  await wrangler(
    [
      "d1",
      "execute",
      stageDatabase,
      "--remote",
      "--file",
      file,
      "--yes",
      "--json",
    ],
    { json: true, logName: "import-" + label },
  );
  console.log("Imported staging " + label);
}
if (!tables.length)
  await ingest("source", resolve(stageDir, "source-copy.sql"));
else {
  // Resume only our exact source copy. Never replace a different existing dataset.
  const db = new DatabaseSync(source.database, { readOnly: true });
  try {
    const remote = (
      await query("SELECT version,data FROM app_state WHERE id=1")
    )[0].results[0];
    const original = db
      .prepare("SELECT version,data FROM app_state WHERE id=1")
      .get();
    assert.equal(remote.version, original.version);
    assert.equal(remote.data, original.data);
  } finally {
    db.close();
  }
  console.log("Verified existing staging source copy; resuming");
}
if (!tables.includes("rms_storage_meta"))
  await ingest(
    "schema",
    resolve(
      root,
      "api/prisma/migrations/202610160001_normalized_storage/migration.sql",
    ),
  );
const marker = (
  await query("SELECT sourceHash,version FROM rms_storage_meta WHERE id=1")
)[0].results;
if (marker.length) {
  assert.equal(marker[0].sourceHash, source.sourceHash);
  assert.equal(marker[0].version, source.sourceVersion);
  console.log("Staging normalized data already imported");
} else {
  const rows = (
    await query(
      "SELECT (SELECT COUNT(*) FROM rms_projects)+(SELECT COUNT(*) FROM rms_clients)+(SELECT COUNT(*) FROM rms_leads) AS n",
    )
  )[0].results[0].n;
  assert.equal(
    rows,
    0,
    "Refusing to import over partial/existing normalized data",
  );
  await ingest("normalized", resolve(source.directory, "normalized-data.sql"));
}
