import { randomBytes, createHash, pbkdf2Sync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "@playwright/test";
import { query, save, evidence } from "./cutover-cloud.mjs";
import { canonical } from "../../api/build/record-codec.mjs";
import originalWorker from "../../baseline/original/_worker.js";
import { sqliteD1 } from "../../tests/helpers/sqlite-d1.mjs";
const productionId = "37aa92aa-d270-4928-89ea-ca949268ac36";
const stageId = "b1cb3744-7d94-453c-8b3c-e23bc407abdf";
const reference = new DatabaseSync(":memory:");
reference.exec(
  await readFile(resolve(evidence, "production-final.sql"), "utf8"),
);
const original = JSON.parse(
  reference.prepare("SELECT data FROM app_state WHERE id=1").get().data,
);
const manifest = JSON.parse(
  await readFile(resolve(evidence, "r2-verification.json"), "utf8"),
);
const project = JSON.parse(
  await readFile(resolve(evidence, "deploy-prod-canary.json"), "utf8"),
);
const canary = project.latest_deployment.url;
async function verify(label, origin, database, noOp) {
  const nonce = randomBytes(8).toString("hex"),
    email = "cutover-check-" + nonce + "@local.test",
    password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16).toString("hex"),
    hash = pbkdf2Sync(
      password,
      Buffer.from(salt, "hex"),
      100000,
      32,
      "sha256",
    ).toString("hex");
  const checks = {},
    timings = [];
  let userId, token, cookie, browser;
  async function request(path, options = {}, expected = 200) {
    const start = performance.now();
    const response = await fetch(origin + path, {
      ...options,
      redirect: "error",
    });
    timings.push({
      path: path.split("?")[0],
      method: options.method || "GET",
      status: response.status,
      ms: Math.round(performance.now() - start),
    });
    if (response.status !== expected) {
      await save(label + "-http-error.json", {
        path: path.split("?")[0],
        status: response.status,
        body: await response.text(),
      });
      throw new Error(
        label + " unexpected HTTP status; inspect private error report",
      );
    }
    return response;
  }
  const auth = () => ({
    authorization: "Bearer " + token,
    "content-type": "application/json",
  });
  const check = (data) =>
    assert.ok(
      canonical(data) === canonical(original),
      label + " business data mismatch",
    );
  try {
    const health = await (await request("/api/health")).json();
    assert.equal(health.db, true);
    assert.equal(health.r2, true);
    await request("/api/state", {}, 401);
    await request("/api/directory/users", {}, 401);
    checks.healthAndUnauthenticated = true;
    const result = await query(
      database,
      "INSERT INTO users(email,full_name,role,scope_name,password_hash,password_salt,password_iterations,active,must_change_password) VALUES(?,'Cutover Verification','SUPER_ADMIN','Cutover Verification',?,?,100000,1,0) RETURNING id",
      [email, hash, salt],
    );
    userId = result[0].results[0].id;
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    token = (await login.json()).accessToken;
    assert.equal(typeof token, "string");
    cookie = login.headers
      .getSetCookie()
      .find((c) => c.startsWith("rms_session="))
      .split(";")[0];
    await request("/api/state", { headers: { cookie } }, 401);
    const refreshed = await (
      await request("/api/auth/refresh", {
        method: "POST",
        headers: { origin, cookie, "x-rms-refresh": "1" },
      })
    ).json();
    token = refreshed.accessToken;
    checks.loginRefreshBearer = true;
    let snapshot = await (
      await request("/api/state", { headers: auth() })
    ).json();
    check(snapshot.data);
    checks.exactBusinessData = true;
    if (noOp) {
      await request("/api/state", {
        method: "PUT",
        headers: auth(),
        body: JSON.stringify(snapshot),
      });
      const actual = await (
        await request("/api/state", { headers: auth() })
      ).json();
      check(actual.data);
      assert.equal(actual.version, snapshot.version + 1);
      await request(
        "/api/state",
        { method: "PUT", headers: auth(), body: JSON.stringify(snapshot) },
        409,
      );
      checks.noOpSavePreservesData = true;
      checks.staleVersionRejected = true;
      snapshot = actual;
    }
    checks.stateVersion = snapshot.version;
    const file = manifest.files[0];
    const bytes = Buffer.from(
      await (
        await request("/api/files/" + encodeURIComponent(file.id), {
          headers: auth(),
        })
      ).arrayBuffer(),
    );
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
    checks.fileDownload = true;
    let portals = 0;
    for (const item of original.projects.filter(
      (p) => p.clientPortal?.enabled && p.clientPortal.token,
    )) {
      const path =
        "/api/client/project?token=" +
        encodeURIComponent(item.clientPortal.token);
      const actual = await (await request(path)).json();
      const expected = await (
        await originalWorker.fetch(new Request(origin + path), {
          DB: sqliteD1(reference),
          FILES: {},
        })
      ).json();
      assert.ok(
        canonical(actual) === canonical(expected),
        "Portal data differs",
      );
      portals++;
    }
    checks.portalParity = portals;
    browser = await chromium.launch({
      executablePath:
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
      path: resolve(evidence, label + "-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    await page
      .locator("#view h1")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });
    await page.screenshot({
      path: resolve(evidence, label + "-mobile.png"),
      fullPage: true,
    });
    assert.equal(errors.length, 0);
    checks.browserLoginReloadDesktopMobile36Menus = true;
    await request("/api/auth/logout", { method: "POST", headers: auth() });
    await request("/api/state", { headers: auth() }, 401);
    checks.logout = true;
    console.log(
      label +
        ": login, Bearer, exact data, file, portal, desktop/mobile passed",
    );
  } finally {
    await browser?.close();
    if (userId) {
      await query(database, "DELETE FROM sessions WHERE user_id=?", [userId]);
      await query(database, "DELETE FROM server_audit WHERE user_id=?", [
        userId,
      ]);
      await query(database, "DELETE FROM users WHERE id=? AND email=?", [
        userId,
        email,
      ]);
    }
    await save(label + "-http-verified.json", {
      origin,
      checkedAt: new Date().toISOString(),
      checks,
      timings,
      testAccountRemoved: Boolean(userId),
      complete: Boolean(
        checks.logout &&
        checks.browserLoginReloadDesktopMobile36Menus &&
        checks.exactBusinessData,
      ),
    });
  }
}
try {
  if (process.argv[2] === "live")
    await verify(
      "production-live",
      "https://rms-rumsy-app.pages.dev",
      productionId,
      false,
    );
  else {
    await verify("production-canary", canary, productionId, true);
    await verify(
      "staging-legacy",
      "https://rms-rumsy-staging.pages.dev",
      stageId,
      false,
    );
  }
} finally {
  reference.close();
}
