import { spawn } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import ts from "../api/node_modules/typescript/lib/typescript.js";
const root = resolve(import.meta.dirname, "..");
const target = process.argv[2];
assert.ok(
  ["production", "staging"].includes(target),
  "Choose production or staging explicitly",
);
const directory = resolve(root, "api/deploy", target);
const parsed = ts.parseConfigFileTextToJson(
  "wrangler.jsonc",
  await readFile(resolve(directory, "wrangler.jsonc"), "utf8"),
);
assert.ok(!parsed.error);
const config = parsed.config,
  production = target === "production";
assert.equal(config.name, production ? "rms-rumsy-app" : "rms-rumsy-staging");
assert.deepEqual(config.d1_databases, [
  {
    binding: "DB",
    database_name: production ? "rms-rumsy" : "rms-rumsy-staging",
    database_id: production
      ? "37aa92aa-d270-4928-89ea-ca949268ac36"
      : "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
  },
]);
assert.deepEqual(config.r2_buckets, [
  {
    binding: "FILES",
    bucket_name: production ? "rms-private" : "rms-private-staging",
  },
]);
assert.equal(config.vars.RMS_STORAGE, production ? "normalized" : "legacy");
assert.equal(config.vars.RMS_MAINTENANCE, "0");
if (!production) assert.ok(!config.vars.RESEND_API_KEY);
const build = resolve(directory, config.pages_build_output_dir);
assert.equal(build, resolve(root, "web/build"));
await access(resolve(build, "_worker.js/index.js"));
await access(resolve(build, "_worker.js/query_compiler_fast_bg.wasm"));
const executable = resolve(root, "api/node_modules/wrangler/bin/wrangler.js");
const env = {
  ...process.env,
  CLOUDFLARE_ACCOUNT_ID: "191e29611e9de58d94252049beca0819",
  WRANGLER_SEND_METRICS: "false",
};
async function run(args, capture = false) {
  const result = await new Promise((accept, reject) => {
    const child = spawn(
      process.execPath,
      [executable, "--cwd", directory, ...args],
      {
        cwd: root,
        env,
        stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      },
    );
    let output = "",
      error = "";
    child.stdout?.on("data", (d) => {
      output += d;
    });
    child.stderr?.on("data", (d) => {
      error += d;
    });
    child.on("error", reject);
    child.on("close", (code) => accept({ code, output, error }));
  });
  if (result.code !== 0)
    throw new Error("Wrangler failed" + (capture ? ": " + result.error : ""));
  return result.output;
}
if (production) {
  const rows = JSON.parse(
    await run(
      [
        "d1",
        "execute",
        "rms-rumsy",
        "--remote",
        "--json",
        "--command",
        "SELECT version,format FROM rms_storage_meta WHERE id=1",
      ],
      true,
    ),
  );
  assert.equal(
    rows[0].results[0]?.format,
    1,
    "Production migration marker missing; deployment blocked",
  );
}
console.log(
  "Deploy target: " + config.name + ", storage: " + config.vars.RMS_STORAGE,
);
if (!process.argv.includes("--check-only"))
  await run([
    "pages",
    "deploy",
    build,
    "--project-name",
    config.name,
    "--branch",
    "main",
    "--commit-dirty=true",
  ]);
