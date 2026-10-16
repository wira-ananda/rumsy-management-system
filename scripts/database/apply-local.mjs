import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { localPaths } from "./local-paths.mjs";
const { root, development } = await localPaths(),
  db = new DatabaseSync(development);
try {
  db.exec("PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000");
  const directory = resolve(root, "api/prisma/migrations"),
    names = (await readdir(directory, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  const history = new Map(
    db
      .prepare("SELECT name,checksum FROM rms_migration_history")
      .all()
      .map((r) => [r.name, r.checksum]),
  );
  let applied = 0,
    backup;
  for (const name of names) {
    const sql = await readFile(
        resolve(directory, name, "migration.sql"),
        "utf8",
      ),
      hash = createHash("sha256").update(sql).digest("hex");
    if (history.has(name)) {
      assert.equal(
        hash,
        history.get(name),
        "Applied migration was modified: " + name,
      );
      continue;
    }
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
      throw new Error(
        "Refusing a destructive/legacy migration; review manually: " + name,
      );
    if (!backup) {
      backup = development + ".before-" + Date.now();
      db.prepare("VACUUM INTO ?").run(backup);
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(sql);
      db.prepare(
        "INSERT INTO rms_migration_history(name,checksum,appliedAt) VALUES(?,?,?)",
      ).run(name, hash, new Date().toISOString());
      assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    applied++;
  }
  console.log(
    JSON.stringify(
      { database: development, applied, backup, productionModified: false },
      null,
      2,
    ),
  );
} finally {
  db.close();
}
