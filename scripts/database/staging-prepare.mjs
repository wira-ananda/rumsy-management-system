import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { root, stageDir, stagingConfig } from "./staging-cli.mjs";
await stagingConfig();
const current = JSON.parse(
  await readFile(resolve(root, "api/.local/current.json"), "utf8"),
);
const source = resolve(root, "api/.local/migration.sqlite");
const db = new DatabaseSync(source, { readOnly: true });
try {
  const backup = resolve(
    process.env.RMS_BACKUP_SQL ||
      "/Users/wiraananda/Downloads/rms-backup-2026-10-16/rms-rumsy.sql",
  );
  const bytes = await readFile(backup),
    report = JSON.parse(
      await readFile(resolve(current.directory, "verification.json"), "utf8"),
    );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    report.sourceHash,
  );
  const state = db.prepare("SELECT * FROM app_state WHERE id=1").get();
  assert.equal(state.version, report.sourceVersion);
  // Split the single large snapshot literal before cloud import. Do not exceed
  // D1's 100 KB SQL statement limit, including UTF-8 and SQL quote escaping.
  const text = bytes.toString("utf8"),
    pattern = /^INSERT INTO "app_state"[^\n]*;$/m;
  assert.equal([...text.matchAll(new RegExp(pattern.source, "gm"))].length, 1);
  const q = (s) => "'" + s.replaceAll("'", "''") + "'";
  const snapshot = [
    `INSERT INTO app_state(id,version,data,updated_at) VALUES(1,${state.version},'',${q(state.updated_at)});`,
  ];
  const characters = Array.from(state.data);
  for (let offset = 0; offset < characters.length; offset += 12000)
    snapshot.push(
      `UPDATE app_state SET data=data||${q(characters.slice(offset, offset + 12000).join(""))} WHERE id=1;`,
    );
  const sanitized =
    text.replace(pattern, snapshot.join("\n")) +
    "\n-- Staging sessions must be issued separately from production.\nDELETE FROM sessions;\n";
  const simulation = new DatabaseSync(":memory:");
  try {
    simulation.exec(sanitized);
    assert.deepEqual(
      simulation.prepare("SELECT * FROM app_state").all(),
      db.prepare("SELECT * FROM app_state").all(),
    );
    assert.equal(
      simulation.prepare("SELECT COUNT(*) AS n FROM sessions").get().n,
      0,
    );
  } finally {
    simulation.close();
  }
  await writeFile(resolve(stageDir, "source-copy.sql"), sanitized, {
    mode: 0o600,
  });
  const files = db.prepare("SELECT * FROM files ORDER BY id").all(),
    manifest = [];
  for (const file of files) {
    const path = resolve(current.files, file.object_key),
      rel = relative(current.files, path);
    assert.ok(rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
    const content = await readFile(path);
    assert.equal(content.length, file.size);
    manifest.push({
      ...file,
      localPath: path,
      sha256: createHash("sha256").update(content).digest("hex"),
    });
  }
  await writeFile(
    resolve(stageDir, "files.json"),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 },
  );
  await writeFile(
    resolve(stageDir, "source.json"),
    JSON.stringify(
      {
        backup,
        database: source,
        prepared: current.database,
        directory: current.directory,
        sourceHash: report.sourceHash,
        sourceVersion: state.version,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify(
      {
        stagingOnly: true,
        sourceVersion: state.version,
        files: files.length,
        bytes: files.reduce((s, f) => s + f.size, 0),
        copiedSessionsCleared: true,
        productionModified: false,
      },
      null,
      2,
    ),
  );
} finally {
  db.close();
}
