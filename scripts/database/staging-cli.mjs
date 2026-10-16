import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import ts from "../../api/node_modules/typescript/lib/typescript.js";
export const root = resolve(import.meta.dirname, "../..");
export const stageDir = resolve(root, "api/.local/staging");
export const stageDatabase = "rms-rumsy-staging";
export const stageBucket = "rms-private-staging";
export const stageAccountId = "191e29611e9de58d94252049beca0819";
export async function stagingConfig() {
  const parsed = ts.parseConfigFileTextToJson(
    "wrangler.jsonc",
    await readFile(resolve(root, "api/deploy/staging/wrangler.jsonc"), "utf8"),
  );
  assert.ok(!parsed.error, "Invalid staging config");
  const config = parsed.config;
  assert.equal(
    config.vars.RMS_STORAGE,
    'normalized',
    'Historical migration tooling is disabled: staging now serves the legacy archive. Use bun run deploy:staging for a code deployment; do not re-import the old migration snapshot.',
  );
  assert.equal(config.name, "rms-rumsy-staging");
  assert.ok(
    !config.account_id,
    "Pages config must set account via CLI environment",
  );
  assert.deepEqual(config.d1_databases, [
    {
      binding: "DB",
      database_name: stageDatabase,
      database_id: "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
    },
  ]);
  assert.deepEqual(config.r2_buckets, [
    { binding: "FILES", bucket_name: stageBucket },
  ]);
  assert.ok(!config.vars.RESEND_API_KEY, "Staging must not send real email");
  await mkdir(stageDir, { recursive: true, mode: 0o700 });
  return config;
}
let serial = 0;
export async function wrangler(args, { json = false, logName } = {}) {
  await stagingConfig();
  const result = await new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "api/node_modules/wrangler/bin/wrangler.js"),
        "--cwd",
        resolve(root, "api/deploy/staging"),
        ...args,
      ],
      {
        cwd: resolve(root, "api"),
        env: {
          ...process.env,
          WRANGLER_SEND_METRICS: "false",
          CLOUDFLARE_ACCOUNT_ID: stageAccountId,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolveResult({ code, stdout, stderr }));
  });
  const log = resolve(
    stageDir,
    (logName || "wrangler-" + Date.now() + "-" + serial++) + ".log",
  );
  await writeFile(log, result.stdout + result.stderr, { mode: 0o600 });
  if (result.code !== 0)
    throw new Error(
      `Staging Wrangler failed (exit ${result.code}); inspect ${log}`,
    );
  if (!json) return result.stdout;
  try {
    return JSON.parse(result.stdout);
  } catch {
    // Bulk import emits upload progress before its JSON result, even with --json.
    const start = result.stdout.search(/^[\[{]\s*$/m);
    if (start >= 0)
      try {
        return JSON.parse(result.stdout.slice(start));
      } catch {}
    throw new Error("Expected JSON from Wrangler; inspect " + log);
  }
}
export const query = (sql) =>
  wrangler(
    ["d1", "execute", stageDatabase, "--remote", "--json", "--command", sql],
    { json: true },
  );
