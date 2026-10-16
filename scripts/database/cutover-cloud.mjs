// Private cutover evidence is written only below ignored api/.local.
import { readFile, writeFile, mkdir, access, chmod } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
export const account = "191e29611e9de58d94252049beca0819";
export const root = resolve(import.meta.dirname, "../..");
export const evidence = resolve(root, "api/.local/cutover-2026-10-17");
await mkdir(evidence, { recursive: true, mode: 0o700 });
export async function save(name, value) {
  await writeFile(
    resolve(evidence, name),
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
}
export async function cf(path, options = {}) {
  assert.ok(path.startsWith("/accounts/" + account + "/"));
  // Reuse the user's Wrangler login without printing or copying credentials.
  const config = await readFile(
    resolve(homedir(), "Library/Preferences/.wrangler/config/default.toml"),
    "utf8",
  );
  const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  assert.ok(token, "Wrangler OAuth login unavailable");
  const response = await fetch("https://api.cloudflare.com/client/v4" + path, {
    ...options,
    headers: { authorization: "Bearer " + token, ...options.headers },
  });
  if (options.raw) return response;
  const body = await response.json();
  if (!response.ok || body.success === false)
    throw new Error(
      "Cloudflare API failed: " +
        response.status +
        " " +
        JSON.stringify(body.errors),
    );
  return body.result;
}
export async function query(id, sql, params = []) {
  assert.ok(
    [
      "37aa92aa-d270-4928-89ea-ca949268ac36",
      "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
    ].includes(id),
  );
  return cf(`/accounts/${account}/d1/database/${id}/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
}
if (process.argv[2] === "inventory") {
  const projects = {};
  for (const name of ["rms-rumsy-app", "rms-rumsy-staging"]) {
    projects[name] = await cf(`/accounts/${account}/pages/projects/${name}`);
    await save(name + "-before.json", projects[name]);
    const p = projects[name],
      d = p.canonical_deployment;
    console.log(
      JSON.stringify({
        project: name,
        deployment: d.id,
        script: p.production_script_name,
        production: {
          d1: p.deployment_configs.production.d1_databases,
          r2: p.deployment_configs.production.r2_buckets,
          envNames: Object.keys(p.deployment_configs.production.env_vars || {}),
        },
      }),
    );
  }
  const workers = await cf(`/accounts/${account}/workers/scripts`);
  await save("workers-before.json", workers);
  console.log("Worker names: " + workers.map((w) => w.id).join(", "));
}
if (process.argv[2] === "inspect") {
  for (const name of ["rms-rumsy-app", "rms-rumsy-staging"]) {
    const p = JSON.parse(
      await readFile(resolve(evidence, name + "-before.json"), "utf8"),
    );
    const detail = await cf(
      `/accounts/${account}/pages/projects/${name}/deployments/${p.canonical_deployment.id}`,
    );
    await save(name + "-deployment.json", detail);
    console.log(
      JSON.stringify({
        name,
        deploymentKeys: Object.keys(detail),
        secretPresent: Boolean(
          p.deployment_configs.production.env_vars.RESEND_API_KEY?.value,
        ),
        secretType:
          p.deployment_configs.production.env_vars.RESEND_API_KEY?.type,
      }),
    );
    for (const suffix of ["content/v2", ""]) {
      const response = await cf(
        `/accounts/${account}/workers/scripts/${p.production_script_name}${suffix ? "/" + suffix : ""}`,
        { raw: true },
      );
      await save(
        name + "-worker-" + (suffix ? "v2" : "raw") + ".bin",
        Buffer.from(await response.arrayBuffer()),
      );
      await save(
        name + "-worker-" + (suffix ? "v2" : "raw") + "-headers.json",
        {
          status: response.status,
          headers: Object.fromEntries(response.headers),
        },
      );
      console.log(
        JSON.stringify({
          name,
          suffix,
          status: response.status,
          contentType: response.headers.get("content-type"),
        }),
      );
    }
  }
  for (const [label, id] of [
    ["old", "37aa92aa-d270-4928-89ea-ca949268ac36"],
    ["new", "b1cb3744-7d94-453c-8b3c-e23bc407abdf"],
  ]) {
    const tables = (
      await query(
        id,
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
      )
    )[0].results;
    const rows = {};
    for (let offset = 0; offset < tables.length; offset += 8) {
      const batch = tables.slice(offset, offset + 8);
      const result = await query(
        id,
        batch
          .map((t) => 'SELECT * FROM "' + t.name.replaceAll('"', '""') + '"')
          .join(";"),
      );
      batch.forEach((t, i) => {
        assert.ok(result[i].success);
        rows[t.name] = result[i].results;
      });
    }
    await save(label + "-rows-before.json", rows);
    console.log(
      JSON.stringify({
        database: label,
        tables: tables.length,
        version:
          rows.rms_storage_meta?.[0]?.version || rows.app_state?.[0]?.version,
        users: rows.users?.length,
        files: rows.files?.length,
        sessions: rows.sessions?.length,
      }),
    );
  }
}
if (process.argv[2] === "files") {
  const old = JSON.parse(
    await readFile(resolve(evidence, "old-rows-before.json"), "utf8"),
  );
  const directory = resolve(evidence, "r2-production");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < old.files.length) {
      const file = old.files[cursor++];
      const key = file.object_key.split("/").map(encodeURIComponent).join("/");
      const hashes = [];
      for (const bucket of ["rms-private", "rms-private-staging"]) {
        const response = await cf(
          `/accounts/${account}/r2/buckets/${bucket}/objects/${key}`,
          { raw: true },
        );
        assert.equal(response.status, 200, "R2 file unavailable: " + file.id);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(bytes.length, file.size);
        hashes.push(createHash("sha256").update(bytes).digest("hex"));
        if (bucket === "rms-private") {
          const path = resolve(directory, file.object_key);
          assert.ok(path.startsWith(directory + "/"));
          await mkdir(resolve(path, ".."), { recursive: true, mode: 0o700 });
          await writeFile(path, bytes, { mode: 0o600 });
        }
      }
      assert.equal(hashes[0], hashes[1], "R2 checksum mismatch: " + file.id);
      results.push({
        id: file.id,
        object_key: file.object_key,
        bytes: file.size,
        sha256: hashes[0],
      });
      if (results.length % 10 === 0)
        console.log(
          "R2 backed up and compared: " +
            results.length +
            "/" +
            old.files.length,
        );
    }
  }
  const outcomes = await Promise.allSettled([worker(), worker(), worker()]);
  await save("r2-verification.json", {
    checkedAt: new Date().toISOString(),
    total: old.files.length,
    verified: results.length,
    bytes: results.reduce((s, f) => s + f.bytes, 0),
    files: results,
  });
  for (const outcome of outcomes)
    if (outcome.status === "rejected") throw outcome.reason;
  console.log("R2 all files verified and downloaded: " + results.length);
}
if (process.argv[2] === "assets") {
  const deployment = JSON.parse(
    await readFile(resolve(evidence, "rms-rumsy-app-deployment.json"), "utf8"),
  );
  const files = [];
  for (const path of Object.keys(deployment.files)) {
    const local = await readFile(resolve(evidence, "old-pages", "." + path));
    const response = await fetch(deployment.url + path);
    assert.equal(response.status, 200);
    const remote = Buffer.from(await response.arrayBuffer());
    assert.ok(local.equals(remote), "Old deployment asset mismatch: " + path);
    files.push({
      path,
      sha256: createHash("sha256").update(local).digest("hex"),
    });
  }
  await save("old-assets-verified.json", {
    deployment: deployment.id,
    assets: files,
  });
  console.log("Old deployment static assets match saved ZIP: " + files.length);
}
if (process.argv[2] === "config") {
  const old = JSON.parse(
    await readFile(resolve(evidence, "rms-rumsy-app-before.json"), "utf8"),
  );
  const prod = {
    name: "rms-rumsy-app",
    pages_build_output_dir: resolve(root, "web/build"),
    compatibility_date: "2026-10-16",
    d1_databases: [
      {
        binding: "DB",
        database_name: "rms-rumsy",
        database_id: "37aa92aa-d270-4928-89ea-ca949268ac36",
      },
    ],
    r2_buckets: [{ binding: "FILES", bucket_name: "rms-private" }],
    vars: {
      RMS_STORAGE: "legacy",
      RMS_MAINTENANCE: "1",
      RMS_URL: "https://rms-rumsy-app.pages.dev",
      EMAIL_FROM: old.deployment_configs.production.env_vars.EMAIL_FROM.value,
    },
  };
  const stage = {
    name: "rms-rumsy-staging",
    pages_build_output_dir: resolve(evidence, "old-pages"),
    compatibility_date: "2026-10-16",
    d1_databases: [
      {
        binding: "DB",
        database_name: "rms-rumsy-staging",
        database_id: "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
      },
    ],
    r2_buckets: [{ binding: "FILES", bucket_name: "rms-private-staging" }],
    vars: {
      RMS_STORAGE: "legacy",
      RMS_MAINTENANCE: "0",
      RMS_URL: "https://rms-rumsy-staging.pages.dev",
    },
  };
  for (const [label, config] of [
    ["prod-maint", prod],
    ["stage-archive", stage],
  ]) {
    await mkdir(resolve(evidence, label), { recursive: true, mode: 0o700 });
    await save(label + "/wrangler.jsonc", config);
  }
  console.log(
    "Pinned production maintenance and legacy staging configs prepared",
  );
}
if (process.argv[2] === "deploy") {
  try {
    await access(resolve(evidence, "completed.json"));
    throw new Error(
      "This cutover is complete. Use bun run deploy:production or deploy:staging for future deployments.",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const label = process.argv[3];
  assert.ok(
    [
      "stage-archive",
      "prod-maint",
      "prod-normalized-maint",
      "prod-canary",
      "prod-live",
    ].includes(label),
  );
  const config = JSON.parse(
    await readFile(resolve(evidence, label, "wrangler.jsonc"), "utf8"),
  );
  const stage = label === "stage-archive";
  assert.equal(config.name, stage ? "rms-rumsy-staging" : "rms-rumsy-app");
  assert.equal(
    config.d1_databases[0].database_id,
    stage
      ? "b1cb3744-7d94-453c-8b3c-e23bc407abdf"
      : "37aa92aa-d270-4928-89ea-ca949268ac36",
  );
  if (!stage && config.vars.RMS_STORAGE === "normalized") {
    const report = JSON.parse(
      await readFile(
        resolve(evidence, "production-normalized-verified.json"),
        "utf8",
      ),
    );
    assert.equal(report.exactBusinessData, true);
    assert.equal(report.legacyDataRowsUnchanged, true);
  }
  if (label === "prod-live") {
    for (const reportName of [
      "production-canary-http-verified.json",
      "staging-legacy-http-verified.json",
    ]) {
      const report = JSON.parse(
        await readFile(resolve(evidence, reportName), "utf8"),
      );
      assert.equal(
        report.complete,
        true,
        "Live activation blocked: " + reportName,
      );
      assert.equal(report.testAccountRemoved, true);
    }
    const files = JSON.parse(
      await readFile(resolve(evidence, "r2-verification.json"), "utf8"),
    );
    assert.equal(files.verified, files.total);
  }
  const result = await new Promise((accept, reject) => {
    const child = spawn(
      process.execPath,
      [
        resolve(root, "api/node_modules/wrangler/bin/wrangler.js"),
        "--cwd",
        resolve(evidence, label),
        "pages",
        "deploy",
        config.pages_build_output_dir,
        "--project-name",
        config.name,
        "--branch",
        label === "prod-canary" ? "cutover-verification" : "main",
        "--commit-dirty=true",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: account,
          WRANGLER_SEND_METRICS: "false",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (d) => {
      output += d;
    });
    child.stderr.on("data", (d) => {
      output += d;
    });
    child.on("error", reject);
    child.on("close", (code) => accept({ code, output }));
  });
  await save("deploy-" + label + ".log", result.output);
  assert.equal(result.code, 0, "Deployment failed; inspect private deploy log");
  const project = await cf(
    `/accounts/${account}/pages/projects/${config.name}`,
  );
  await save("deploy-" + label + ".json", project);
  const deployed =
    label === "prod-canary"
      ? project.latest_deployment
      : project.canonical_deployment;
  assert.ok(deployed);
  assert.equal(deployed.d1_databases.DB.id, config.d1_databases[0].database_id);
  assert.equal(
    deployed.r2_buckets.FILES.name,
    config.r2_buckets[0].bucket_name,
  );
  if (!stage && label !== "prod-canary")
    assert.equal(
      deployed.env_vars.RESEND_API_KEY?.type,
      "secret_text",
      "Production email secret missing",
    );
  console.log(
    JSON.stringify({
      project: config.name,
      deployment: deployed.id,
      url: deployed.url,
      storage: config.vars.RMS_STORAGE,
      maintenance: config.vars.RMS_MAINTENANCE,
      bindingsVerified: true,
      emailSecretPreserved: !stage,
    }),
  );
}
if (process.argv[2] === "finalize") {
  const checks = {};
  for (const name of [
    "production-canary",
    "staging-legacy",
    "production-live",
  ]) {
    const report = JSON.parse(
      await readFile(resolve(evidence, name + "-http-verified.json"), "utf8"),
    );
    assert.equal(report.complete, true);
    assert.equal(report.testAccountRemoved, true);
    checks[name] = report;
  }
  const verification = JSON.parse(
    await readFile(
      resolve(evidence, "production-normalized-verified.json"),
      "utf8",
    ),
  );
  assert.equal(verification.exactBusinessData, true);
  assert.equal(verification.legacyDataRowsUnchanged, true);
  const files = JSON.parse(
    await readFile(resolve(evidence, "r2-verification.json"), "utf8"),
  );
  assert.equal(files.verified, files.total);
  const production = await cf(
    `/accounts/${account}/pages/projects/rms-rumsy-app`,
  );
  const staging = await cf(
    `/accounts/${account}/pages/projects/rms-rumsy-staging`,
  );
  for (const [project, storage, id, bucket] of [
    [
      production,
      "normalized",
      "37aa92aa-d270-4928-89ea-ca949268ac36",
      "rms-private",
    ],
    [
      staging,
      "legacy",
      "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
      "rms-private-staging",
    ],
  ]) {
    const d = project.canonical_deployment;
    assert.equal(d.d1_databases.DB.id, id);
    assert.equal(d.r2_buckets.FILES.name, bucket);
    assert.equal(d.env_vars.RMS_STORAGE.value, storage);
    assert.equal(d.env_vars.RMS_MAINTENANCE.value, "0");
    await save(project.name + "-after.json", project);
  }
  assert.equal(
    production.canonical_deployment.env_vars.RESEND_API_KEY.type,
    "secret_text",
  );
  const current = (
    await query(
      "37aa92aa-d270-4928-89ea-ca949268ac36",
      "SELECT version FROM rms_storage_meta WHERE id=1",
    )
  )[0].results[0];
  const reference = JSON.parse(
    await readFile(resolve(evidence, "old-rows-before.json"), "utf8"),
  );
  const oldStage = await query(
    "b1cb3744-7d94-453c-8b3c-e23bc407abdf",
    "SELECT data FROM app_state WHERE id=1;SELECT * FROM users;SELECT * FROM files",
  );
  assert.equal(oldStage[0].results[0].data, reference.app_state[0].data);
  const { canonical } = await import("../../api/build/record-codec.mjs");
  for (const [index, table] of [
    [1, "users"],
    [2, "files"],
  ])
    assert.ok(
      canonical(oldStage[index].results.map(canonical).sort()) ===
        canonical(reference[table].map(canonical).sort()),
      "Staging original rows differ: " + table,
    );
  const backups = [];
  for (const name of [
    "production-before.sql",
    "production-final.sql",
    "staging-before.sql",
  ]) {
    const path = resolve(evidence, name),
      bytes = await readFile(path);
    await chmod(path, 0o600);
    backups.push({
      name,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  const complete = {
    completedAt: new Date().toISOString(),
    production: {
      url: "https://rms-rumsy-app.pages.dev",
      deployment: production.canonical_deployment.id,
      database: "rms-rumsy",
      bucket: "rms-private",
      storage: "normalized",
      version: current.version,
    },
    staging: {
      url: "https://rms-rumsy-staging.pages.dev",
      deployment: staging.canonical_deployment.id,
      database: "rms-rumsy-staging",
      bucket: "rms-private-staging",
      storage: "legacy",
      version: 920,
    },
    exactBusinessDataAtCutover: true,
    accountAndFileRowsPreserved: true,
    records: verification.records,
    models: verification.models,
    users: verification.users,
    files: files.verified,
    fileBytes: files.bytes,
    allFileChecksumsEqual: true,
    emailSecretPreserved: true,
    maintenanceOff: true,
    temporaryTestAccountsRemoved: true,
    backups,
    productionModified: true,
    automaticSynchronization: false,
    legacySnapshotWriteGuard: true,
    checks,
  };
  await save("completed.json", complete);
  console.log(
    JSON.stringify(
      {
        completedAt: complete.completedAt,
        production: complete.production,
        staging: complete.staging,
        exactBusinessDataAtCutover: true,
        records: complete.records,
        users: complete.users,
        files: complete.files,
        allFileChecksumsEqual: true,
        maintenanceOff: true,
        backups: backups.map((b) => b.name),
      },
      null,
      2,
    ),
  );
}
if (process.argv[2] === "freeze-legacy") {
  const response = await fetch(
    "https://rms-rumsy-app.pages.dev/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  );
  assert.equal(
    response.status,
    503,
    "Main production must be in maintenance first",
  );
  assert.equal((await response.json()).error, "MAINTENANCE");
  const sql = ["INSERT", "UPDATE", "DELETE"]
    .map(
      (op) =>
        `CREATE TRIGGER IF NOT EXISTS cutover_legacy_${op.toLowerCase()} BEFORE ${op} ON app_state BEGIN SELECT RAISE(ABORT, 'RMS_LEGACY_STORAGE_FROZEN_RELOAD_APP'); END;`,
    )
    .join("\n");
  await save("freeze-legacy.sql", sql);
  const result = await query("37aa92aa-d270-4928-89ea-ca949268ac36", sql);
  await save("freeze-result.json", result);
  const state = (
    await query(
      "37aa92aa-d270-4928-89ea-ca949268ac36",
      "SELECT * FROM app_state WHERE id=1",
    )
  )[0].results[0];
  const before = JSON.parse(
    await readFile(resolve(evidence, "old-rows-before.json"), "utf8"),
  ).app_state[0];
  assert.deepEqual(
    state,
    before,
    "Production state changed since initial comparison; stop and reconcile",
  );
  await save("freeze-confirmed.json", {
    checkedAt: new Date().toISOString(),
    sourceVersion: state.version,
    stateUnchanged: true,
  });
  console.log(
    "Main maintenance confirmed; legacy snapshot writes now blocked on every deployment sharing production D1. Snapshot remains version " +
      state.version,
  );
}
