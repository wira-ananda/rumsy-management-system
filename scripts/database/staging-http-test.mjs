import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash, pbkdf2Sync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { root, stageDir, stagingConfig, query } from "./staging-cli.mjs";
import { canonical } from "../../api/build/record-codec.mjs";
import original from "../../baseline/original/_worker.js";
import { sqliteD1 } from "../../tests/helpers/sqlite-d1.mjs";
await stagingConfig();
const origin = "https://rms-rumsy-staging.pages.dev";
const source = JSON.parse(
  await readFile(resolve(stageDir, "source.json"), "utf8"),
);
const db = new DatabaseSync(source.prepared, { readOnly: true });
const originalData = JSON.parse(
  db.prepare("SELECT data FROM app_state WHERE id=1").get().data,
);
const nonce = randomBytes(8).toString("hex"),
  email = "staging-check-" + nonce + "@local.test",
  password = randomBytes(24).toString("base64url");
const salt = randomBytes(16).toString("hex"),
  hash = pbkdf2Sync(
    password,
    Buffer.from(salt, "hex"),
    100000,
    32,
    "sha256",
  ).toString("hex");
const q = (s) => "'" + s.replaceAll("'", "''") + "'";
const results = {},
  timings = [];
let userId, token, cookie, uploadedId, browser;
async function request(path, options = {}, expected = 200) {
  const start = performance.now();
  const response = await fetch(origin + path, {
    redirect: "error",
    ...options,
  });
  timings.push({
    path: path.split("?")[0],
    method: options.method || "GET",
    status: response.status,
    ms: Math.round(performance.now() - start),
  });
  if (response.status !== expected) {
    await writeFile(
      resolve(stageDir, "http-error.json"),
      JSON.stringify(
        {
          path: path.split("?")[0],
          status: response.status,
          body: await response.text(),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    throw new Error(
      `Staging HTTP ${path.split("?")[0]} returned ${response.status}; expected ${expected}. See api/.local/staging/http-error.json`,
    );
  }
  return response;
}
const auth = () => ({
  authorization: "Bearer " + token,
  "content-type": "application/json",
});
async function readState() {
  return (await request("/api/state", { headers: auth() })).json();
}
async function save(snapshot) {
  return (
    await request("/api/state", {
      method: "PUT",
      headers: auth(),
      body: JSON.stringify(snapshot),
    })
  ).json();
}
const checkData = (data) => {
  if (canonical(data) !== canonical(originalData))
    throw new Error("Staging business data differs from source snapshot");
};
try {
  const health = await (await request("/api/health")).json();
  assert.equal(health.db, true);
  assert.equal(health.r2, true);
  await request("/api/state", {}, 401);
  results.healthAndUnauthenticated = true;
  const inserted = await query(
    `INSERT INTO users(email,full_name,role,scope_name,password_hash,password_salt,password_iterations,active,must_change_password) VALUES(${q(email)},'Staging Verification','SUPER_ADMIN','Staging Verification',${q(hash)},${q(salt)},100000,1,0); SELECT id FROM users WHERE email=${q(email)};`,
  );
  userId = inserted[1].results[0].id;
  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const logged = await login.json();
  token = logged.accessToken;
  assert.equal(typeof token, "string");
  cookie = login.headers
    .getSetCookie()
    .find((c) => c.startsWith("rms_session="))
    .split(";")[0];
  results.login = true;
  await request("/api/state", { headers: { cookie } }, 401);
  results.cookieOnlyRejected = true;
  const refreshed = await (
    await request("/api/auth/refresh", {
      method: "POST",
      headers: { origin, cookie, "x-rms-refresh": "1" },
    })
  ).json();
  token = refreshed.accessToken;
  assert.equal(typeof token, "string");
  results.refresh = true;
  let snapshot = await readState();
  checkData(snapshot.data);
  results.exactPrismaSnapshot = true;
  console.log(
    "Staging HTTPS: login, refresh, Bearer enforcement and exact Prisma read passed",
  );
  const noop = await save(snapshot);
  assert.equal(noop.version, snapshot.version + 1);
  snapshot = await readState();
  checkData(snapshot.data);
  results.atomicNoOpSave = true;
  const edited = structuredClone(snapshot);
  edited.data.clients[0].notes =
    String(edited.data.clients[0].notes || "") +
    " [staging-verification-" +
    nonce +
    "]";
  const saved = await save(edited);
  let actual = await readState();
  assert.equal(actual.version, saved.version);
  assert.equal(actual.data.clients[0].notes, edited.data.clients[0].notes);
  await request(
    "/api/state",
    { method: "PUT", headers: auth(), body: JSON.stringify(edited) },
    409,
  );
  results.staleWriteRejected = true;
  await save({ version: actual.version, data: originalData });
  actual = await readState();
  checkData(actual.data);
  results.businessEditAndRestore = true;
  console.log(
    "Staging HTTPS: D1 batch writes, row update, conflict rejection and exact restore passed",
  );
  const manifest = JSON.parse(
      await readFile(resolve(stageDir, "files.json"), "utf8"),
    ),
    existing = manifest[0];
  const file = Buffer.from(
    await (
      await request("/api/files/" + encodeURIComponent(existing.id), {
        headers: auth(),
      })
    ).arrayBuffer(),
  );
  assert.equal(
    createHash("sha256").update(file).digest("hex"),
    existing.sha256,
  );
  results.originalFileDownload = true;
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6uAAAAABJRU5ErkJggg==",
    "base64",
  );
  const form = new FormData();
  form.set(
    "file",
    new File([image], "staging-verification.png", { type: "image/png" }),
  );
  form.set("entityType", "STAGING_VERIFY");
  form.set("entityId", nonce);
  const uploaded = await (
    await request("/api/files", {
      method: "POST",
      headers: { authorization: "Bearer " + token },
      body: form,
    })
  ).json();
  uploadedId = uploaded.id;
  const uploadedContent = Buffer.from(
    await (
      await request("/api/files/" + uploadedId, { headers: auth() })
    ).arrayBuffer(),
  );
  assert.equal(
    createHash("sha256").update(uploadedContent).digest("hex"),
    createHash("sha256").update(image).digest("hex"),
  );
  await request("/api/files/" + uploadedId, {
    method: "DELETE",
    headers: auth(),
  });
  await request("/api/files/" + uploadedId, { headers: auth() }, 404);
  uploadedId = null;
  results.uploadDownloadDelete = true;
  let portals = 0;
  for (const project of originalData.projects.filter(
    (p) => p.clientPortal?.enabled && p.clientPortal.token,
  )) {
    const path =
      "/api/client/project?token=" +
      encodeURIComponent(project.clientPortal.token);
    const remote = await (await request(path)).json(),
      reference = await (
        await original.fetch(new Request(origin + path), {
          DB: sqliteD1(db),
          FILES: {},
        })
      ).json();
    if (canonical(remote) !== canonical(reference))
      throw new Error("Staging portal differs from source serializer");
    portals++;
  }
  results.portalParity = portals;
  console.log(
    "Staging HTTPS: original files, isolated upload/delete and portal responses passed",
  );
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      "/Users/wiraananda/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell",
    headless: true,
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginPassword").fill(password);
  await page.locator("#loginForm button").click();
  await page
    .locator("#view h1")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await page.locator(".nav a").count(), 36);
  await page.reload({ waitUntil: "networkidle" });
  await page
    .locator("#view h1")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.screenshot({
    path: resolve(stageDir, "dashboard-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page
    .locator("#view h1")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.screenshot({
    path: resolve(stageDir, "dashboard-mobile.png"),
    fullPage: true,
  });
  assert.equal(errors.length, 0, "Browser runtime error");
  results.svelteLoginDesktopMobileAndReload = true;
  await browser.close();
  browser = null;
  await request("/api/auth/logout", { method: "POST", headers: auth() });
  await request("/api/state", { headers: auth() }, 401);
  results.logoutRevokesToken = true;
  results.finalStateVersion = actual.version;
  console.log(
    "Staging browser: Svelte login, 36 menus, reload, desktop/mobile and logout passed",
  );
} finally {
  await browser?.close();
  if (uploadedId && token)
    try {
      await request("/api/files/" + uploadedId, {
        method: "DELETE",
        headers: auth(),
      });
    } catch {}
  if (userId) {
    await query(
      `DELETE FROM sessions WHERE user_id=${userId}; DELETE FROM server_audit WHERE user_id=${userId}; DELETE FROM users WHERE id=${userId} AND email=${q(email)};`,
    );
  }
  db.close();
  await writeFile(
    resolve(stageDir, "http-verification.json"),
    JSON.stringify(
      {
        origin,
        checkedAt: new Date().toISOString(),
        results,
        timings,
        testAccountRemoved: !!userId,
        complete: Boolean(results.logoutRevokesToken && results.businessEditAndRestore && results.svelteLoginDesktopMobileAndReload),
        productionModified: false,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
}
// Recheck every business record and original user/file row after cleanup.
await import("./staging-verify.mjs");
