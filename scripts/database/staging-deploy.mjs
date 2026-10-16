import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { root, stageDir, stagingConfig, wrangler } from "./staging-cli.mjs";
const config = await stagingConfig();
const db = JSON.parse(
  await readFile(resolve(stageDir, "database-verification.json"), "utf8"),
);
const files = JSON.parse(
  await readFile(resolve(stageDir, "file-verification.json"), "utf8"),
);
assert.equal(db.database, "rms-rumsy-staging");
assert.equal(db.uuid, "b1cb3744-7d94-453c-8b3c-e23bc407abdf");
assert.equal(db.exactBusinessData, true);
assert.equal(files.bucket, "rms-private-staging");
assert.equal(files.verified, files.total);
assert.equal(config.vars.RMS_STORAGE, "normalized");
const output = await wrangler(
  [
    "pages",
    "deploy",
    resolve(root, "web/build"),
    "--project-name",
    "rms-rumsy-staging",
    "--branch",
    "main",
    "--commit-dirty=true",
  ],
  { logName: "deployment" },
);
await writeFile(
  resolve(stageDir, "deployment-result.json"),
  JSON.stringify(
    {
      project: "rms-rumsy-staging",
      url: "https://rms-rumsy-staging.pages.dev",
      createdAt: new Date().toISOString(),
      output,
      productionModified: false,
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
console.log(output);
