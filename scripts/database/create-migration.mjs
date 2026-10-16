import { mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "../.."),
  name = process.argv[2];
if (!name || !/^[a-z][a-z0-9_-]{2,60}$/.test(name))
  throw new Error("Usage: bun run db:migration add_client_tax_id");
const date = new Date().toISOString().replace(/\D/g, "").slice(0, 14),
  dir = resolve(root, "api/prisma/migrations", date + "_" + name);
await mkdir(dir, { recursive: false });
const cli = resolve(root, "api/node_modules/prisma/build/index.js"),
  schema = resolve(root, "api/prisma/schema.prisma"),
  applied = resolve(root, "api/prisma/applied.prisma"),
  sqlPath = resolve(dir, "migration.sql");
const result = spawnSync(
  process.execPath,
  [
    cli,
    "migrate",
    "diff",
    "--from-schema",
    applied,
    "--to-schema",
    schema,
    "--script",
    "--output",
    sqlPath,
  ],
  { cwd: resolve(root, "api"), stdio: "inherit" },
);
if (result.status !== 0) {
  await rm(dir, { recursive: true });
  process.exit(result.status ?? 1);
}
const sql = await readFile(sqlPath, "utf8");
const statements = sql
  .replace(/--[^\n]*/g, "")
  .split(";")
  .filter((s) => s.trim());
if (!statements.length) {
  await rm(dir, { recursive: true });
  console.log("No schema changes.");
  process.exit(0);
}
// Never generate destructive/legacy-table changes automatically.
if (
  statements.some(
    (s) =>
      !/^\s*(CREATE\s+(UNIQUE\s+)?(TABLE|INDEX)|ALTER\s+TABLE)\s+"rms_[a-zA-Z0-9_]+"/i.test(
        s,
      ),
  ) ||
  /\b(DROP\s+(TABLE|COLUMN)|DELETE\s+FROM|TRUNCATE)\b/i.test(sql)
) {
  await writeFile(
    resolve(dir, "REQUIRES-REVIEW.txt"),
    "Migration may rebuild/drop or modify a legacy table. Do not apply automatically. Review SQL, prepare a fresh backup and design a data-preserving migration.\n",
  );
  console.error(
    "SQL needs manual review; schema checkpoint has not changed:",
    sqlPath,
  );
  process.exit(2);
}
await copyFile(schema, applied);
console.log("Generated locally; no database modified:", sqlPath);
console.log(
  "Review SQL and apply to a disposable local DB before any Cloudflare migration. Then run bun run db:generate.",
);
