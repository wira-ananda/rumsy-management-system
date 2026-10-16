import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, ".."),
  stamp = new Date().toISOString().replaceAll(":", "-");
const directory = resolve(root, "api/migration-artifacts", "release-" + stamp);
await mkdir(directory, { recursive: true });
const deploy = resolve(directory, "pages");
await cp(resolve(root, "web/build"), deploy, { recursive: true });
await cp(
  resolve(root, "api/prisma/migrations"),
  resolve(directory, "schema-migrations"),
  { recursive: true },
);
const files = [];
async function scan(base) {
  for (const item of await readdir(base, { withFileTypes: true })) {
    const path = resolve(base, item.name);
    if (item.isDirectory()) await scan(path);
    else {
      const name = relative(deploy, path).split(sep).join("/");
      if (
        /(^|\/)(node_modules|tests|baseline|\.local|\.env)(\/|$)|\.(sqlite|sql|prisma)$/i.test(
          name,
        )
      )
        throw new Error(
          "Unexpected source/private file in deployment: " + name,
        );
      const data = await readFile(path);
      files.push({
        path: name,
        bytes: data.length,
        sha256: createHash("sha256").update(data).digest("hex"),
      });
    }
  }
}
await scan(deploy);
if (
  !files.some((f) => f.path === "_worker.js/index.js") ||
  !files.some((f) => f.path === "_worker.js/query_compiler_fast_bg.wasm")
)
  throw new Error("Incomplete module Worker");
const manifest = {
  createdAt: new Date().toISOString(),
  status: "LOCAL_RELEASE_NOT_DEPLOYED",
  project: "rms-rumsy-app",
  defaultStorage: "legacy",
  maintenanceDefault: "off",
  deploymentDirectory: deploy,
  containsBackupData: false,
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
};
await writeFile(
  resolve(directory, "release.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  resolve(directory, "READ-ME-FIRST.txt"),
  "Deploy only the pages/ directory through Wrangler Pages.\nDo not upload this entire release directory to Cloudflare.\nNo data is migrated by deployment. Do not enable normalized until fresh data is migrated and verified.\nDatabase cutover requires a separately approved write pause, fresh backup, staging verification, and review of every active writer.\nSee " +
    resolve(root, "PRODUCTION-CUTOVER.md") +
    "\n",
);
console.log(
  JSON.stringify(
    {
      directory,
      deploymentDirectory: deploy,
      files: files.length,
      bytes: files.reduce((s, f) => s + f.bytes, 0),
      productionModified: false,
    },
    null,
    2,
  ),
);
