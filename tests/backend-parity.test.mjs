import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import original from "../baseline/original/_worker.js";
import migrated from "../api/build/_worker.js";
import { createMockBindings } from "./helpers/mock-bindings.mjs";
import { roles } from "../web/src/lib/constants/catalog.js";

const origin = "https://rms.test";
const sessionToken = "existing-production-compatible-session";
const cookie = "rms_session=" + sessionToken;
const accessToken = "test-access-token-".padEnd(43, "x");
const authHeaders = (worker) =>
  worker === migrated
    ? { cookie, authorization: `Bearer ${accessToken}` }
    : { cookie };
function fixture(role = "SUPER_ADMIN") {
  const f = createMockBindings();
  f.db
    .prepare(
      "UPDATE users SET created_at='2026-01-01 00:00:00',updated_at='2026-01-01 00:00:00'",
    )
    .run();
  f.db.prepare("UPDATE app_state SET updated_at='2026-01-01 00:00:00'").run();
  const state = JSON.parse(
    f.db.prepare("SELECT data FROM app_state").get().data,
  );
  state.projects[0].clientPortal.createdAt = "2026-01-01T00:00:00.000Z";
  f.db.prepare("UPDATE app_state SET data=?").run(JSON.stringify(state));
  const user = f.db
    .prepare("SELECT * FROM users WHERE role=? LIMIT 1")
    .get(role);
  f.db
    .prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    )
    .run(
      "existing-session",
      user.id,
      createHash("sha256").update(sessionToken).digest("hex"),
      "2099-01-01T00:00:00.000Z",
    );
  f.db
    .prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    )
    .run(
      "access:existing-session:fixture",
      user.id,
      createHash("sha256").update(accessToken).digest("hex"),
      "2099-01-01T00:00:00.000Z",
    );
  return f;
}
async function compare(
  path,
  {
    method = "GET",
    body,
    auth = true,
    role = "SUPER_ADMIN",
    headers = {},
    setup,
  } = {},
) {
  const fixtures = [fixture(role), fixture(role)];
  try {
    const outputs = [];
    for (const [i, worker] of [original, migrated].entries()) {
      const f = fixtures[i];
      if (setup) await setup(f);
      const payload = typeof body === "function" ? body(f) : body;
      const request = new Request(origin + path, {
        method,
        headers: {
          ...(auth ? authHeaders(worker) : {}),
          ...(payload instanceof FormData
            ? {}
            : payload !== undefined
              ? { "content-type": "application/json" }
              : {}),
          ...headers,
        },
        ...(payload !== undefined
          ? {
              body:
                payload instanceof FormData
                  ? payload
                  : typeof payload === "string"
                    ? payload
                    : JSON.stringify(payload),
            }
          : {}),
      });
      const response = await worker.fetch(request, f.env);
      const contentType = response.headers.get("content-type") || "";
      const data =
        method === "HEAD"
          ? null
          : contentType.includes("application/json")
            ? await response.json()
            : Buffer.from(await response.arrayBuffer()).toString("base64");
      // Authentication is deliberately upgraded; business payloads/permissions
      // are still compared against the original cookie-authenticated Worker.
      if (i === 1 && path === "/api/auth/login" && response.ok) {
        assert.match(data.accessToken, /^[A-Za-z0-9_-]{43}$/);
        assert.equal(data.tokenType, "Bearer");
        assert.ok(data.expiresIn > 0 && data.expiresIn <= 900);
        delete data.accessToken;
        delete data.tokenType;
        delete data.expiresIn;
      }
      const result = {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        data,
      };
      if (result.headers["set-cookie"])
        result.headers["set-cookie"] = result.headers["set-cookie"].replace(
          /rms_session=[^;]+/,
          "rms_session=<token>",
        );
      outputs.push(result);
    }
    assert.deepEqual(outputs[1], outputs[0], `${role} ${method} ${path}`);
    assert.deepEqual(
      JSON.parse(
        fixtures[1].db.prepare("SELECT data FROM app_state").get().data,
      ),
      JSON.parse(
        fixtures[0].db.prepare("SELECT data FROM app_state").get().data,
      ),
      "persisted state differs",
    );
    assert.deepEqual(
      fixtures[1].db
        .prepare(
          "SELECT user_id,action,detail,ip FROM server_audit ORDER BY id",
        )
        .all(),
      fixtures[0].db
        .prepare(
          "SELECT user_id,action,detail,ip FROM server_audit ORDER BY id",
        )
        .all(),
      "server audit differs",
    );
    return outputs[1];
  } finally {
    fixtures.forEach((f) => f.close());
  }
}

test("Hono preserves public routes, authentication failures, method and trailing-slash behavior", async () => {
  for (const path of [
    "/api/health",
    "/api/auth/me",
    "/api/state",
    "/api/directory/sales",
    "/api/admin/users",
    "/api/unknown",
    "/api/health/",
    "/api",
    "/",
  ])
    await compare(path, { auth: false });
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    for (const path of ["/api/health", "/api/auth/me", "/api/unknown"])
      await compare(path, { method, auth: false });
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    for (const path of ["/api/health", "/api/auth/me", "/api/state"])
      await compare(path, { method });
  for (const [path, method] of [
    ["/api/files", "GET"],
    ["/api/files", "DELETE"],
    ["/api/files/", "GET"],
    ["/api/files/", "DELETE"],
    ["/api/client/file", "GET"],
    ["/api/client/file/", "GET"],
    ["/api/admin/users", "PATCH"],
    ["/api/admin/users/", "GET"],
    ["/api/admin/users/", "PATCH"],
  ])
    for (const auth of [false, true]) await compare(path, { method, auth });
});

test("Hono preserves login responses, cookie security flags and localized validation", async () => {
  for (const body of [
    { email: "super_admin@local.test", password: "local-test-password" },
    { email: "  SUPER_ADMIN@LOCAL.TEST ", password: "local-test-password" },
    { email: "missing@local.test", password: "wrong" },
    { email: "super_admin@local.test", password: "wrong" },
    {},
    "{invalid",
  ])
    await compare("/api/auth/login", { method: "POST", body, auth: false });
  await compare("/api/auth/login", {
    method: "POST",
    body: { email: "super_admin@local.test", password: "local-test-password" },
    auth: false,
    setup: (f) =>
      f.db.prepare("UPDATE users SET active=0 WHERE role='SUPER_ADMIN'").run(),
  });
});

test("Hono keeps every role access decision when the new Bearer authentication is supplied", async () => {
  for (const role of Object.keys(roles))
    for (const path of [
      "/api/auth/me",
      "/api/directory/sales",
      "/api/directory/users",
      "/api/state",
      "/api/admin/users",
      "/api/admin/email/status",
    ])
      await compare(path, { role });
  await compare("/api/auth/me", {
    setup: (f) =>
      f.db
        .prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z'")
        .run(),
  });
  await compare("/api/state", {
    setup: (f) => f.db.prepare("UPDATE users SET active=0").run(),
  });
  await compare("/api/auth/logout", { method: "POST", body: {} });
});

test("Hono preserves user creation, edits, duplicate emails, permissions and password changes", async () => {
  const body = {
    fullName: "Migrated User",
    email: "migrated@local.test",
    password: "a-valid-password",
    role: "SALES_EXECUTIVE",
    scopeName: "Migrated Sales",
  };
  await compare("/api/admin/users", { method: "POST", body });
  await compare("/api/admin/users", {
    method: "POST",
    body: { ...body, email: "super_admin@local.test" },
  });
  await compare("/api/admin/users", {
    method: "POST",
    body: { ...body, password: "short" },
  });
  await compare("/api/admin/users", {
    method: "POST",
    body,
    role: "SALES_EXECUTIVE",
  });
  for (const id of ["1", "9999", "nested/id"])
    await compare("/api/admin/users/" + id, {
      method: "PATCH",
      body: {
        fullName: "Updated User",
        role: "SALES_EXECUTIVE",
        scopeName: "Updated",
        active: false,
      },
    });
  for (const body of [
    { oldPassword: "local-test-password", newPassword: "new-valid-password" },
    { oldPassword: "wrong", newPassword: "new-valid-password" },
    { oldPassword: "local-test-password", newPassword: "short" },
  ])
    await compare("/api/auth/change-password", { method: "POST", body });
});

test("Hono preserves full state, version conflicts, unknown fields and all sensitive write guards", async () => {
  await compare("/api/state", { method: "PUT", body: {} });
  await compare("/api/state", {
    method: "PUT",
    body: { version: 99, data: {} },
  });
  for (const role of Object.keys(roles))
    await compare("/api/state", {
      method: "PUT",
      role,
      body: (f) => {
        const state = JSON.parse(
          f.db.prepare("SELECT data FROM app_state").get().data,
        );
        state.externalField = { unchangedContract: true };
        state.settings = { changed: true };
        state.escalations = [{ id: "private-change" }];
        for (const p of state.projects) {
          p.started = true;
          p.completionApproved = true;
          p.contract.status = "SIGNED";
          p.handover.status = "ACCEPTED";
          p.qcFindings = [];
          p.inspections = [];
          for (const t of p.transactions) {
            t.status = "VERIFIED";
            t.amount = 123;
          }
          for (const a of p.addendums) a.status = "APPROVED";
        }
        for (const t of state.tasks) {
          t.status = "DONE";
          t.reviewerUserId = "not-current-user";
        }
        return { version: 1, data: state };
      },
    });
  for (const role of ["SALES_EXECUTIVE", "HOLDING_FINANCE", "SUPER_ADMIN"])
    await compare("/api/state", {
      method: "PUT",
      role,
      body: (f) => {
        const state = JSON.parse(
          f.db.prepare("SELECT data FROM app_state").get().data,
        );
        state.projects = [];
        state.tasks = [];
        state.audit = [];
        return { version: 1, data: state };
      },
    });
});

test("Hono preserves public portal tokens, published report filtering and file access", async () => {
  for (const token of [
    "",
    "short",
    "valid-length-but-not-a-project-token-00000000000000000000",
  ])
    await compare("/api/client/project?token=" + token, { auth: false });
  const token = "rms-local-test-client-token-00000000000000000000000000000000";
  await compare("/api/client/project?token=" + token, { auth: false });
  for (const path of [
    "/api/client/file/test-photo-1?token=" + token,
    "/api/client/file/test-photo-1?token=short",
    "/api/client/file/missing?token=" + token,
    "/api/files/test-photo-1",
    "/api/files/test-photo-1?download=1",
    "/api/files/missing",
    "/api/files/nested/id",
  ])
    await compare(path, { auth: !path.startsWith("/api/client/") });
  for (const role of ["SALES_EXECUTIVE", "SUPER_ADMIN"])
    await compare("/api/files/test-photo-1", { method: "DELETE", role });
  await compare("/api/files/missing", { method: "DELETE" });
});

test("Hono uploads remain multipart with identical metadata and private R2 content", async () => {
  for (const worker of [original, migrated]) {
    const f = fixture();
    try {
      const form = new FormData();
      form.append(
        "file",
        new File(["file-content"], "bukti pembayaran.pdf", {
          type: "application/pdf",
        }),
      );
      form.append("entityType", "PAYMENT");
      form.append("entityId", "project-1");
      const response = await worker.fetch(
        new Request(origin + "/api/files", {
          method: "POST",
          headers: authHeaders(worker),
          body: form,
        }),
        f.env,
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.name, "bukti pembayaran.pdf");
      assert.equal(data.size, 12);
      assert.equal(data.type, "application/pdf");
      const download = await worker.fetch(
        new Request(origin + "/api/files/" + data.id, {
          headers: authHeaders(worker),
        }),
        f.env,
      );
      assert.equal(await download.text(), "file-content");
      assert.equal(download.headers.get("cache-control"), "private, no-store");
      assert.match(download.headers.get("content-disposition"), /inline/);
      const removed = await worker.fetch(
        new Request(origin + "/api/files/" + data.id, {
          method: "DELETE",
          headers: authHeaders(worker),
        }),
        f.env,
      );
      assert.equal(removed.status, 200);
      assert.equal(f.files.size, 3);
    } finally {
      f.close();
    }
  }
  await compare("/api/files", { method: "POST", body: () => new FormData() });
  await compare("/api/files", {
    method: "POST",
    body: () => {
      const fd = new FormData();
      fd.append(
        "file",
        new File([new Uint8Array(25 * 1024 * 1024 + 1)], "large.bin"),
      );
      return fd;
    },
  });
});

test("Hono preserves notification validation and behavior without Resend credentials", async () => {
  for (const role of ["SUPER_ADMIN", "ADMIN_GENERAL", "SALES_EXECUTIVE"]) {
    await compare("/api/admin/email/test", {
      method: "POST",
      body: { to: "test@example.test" },
      role,
    });
    for (const body of [
      {},
      { kind: "INVALID", toUserId: 1 },
      { kind: "ASSIGNED", toUserId: 99999, task: {} },
      { kind: "SUBMITTED", toUserId: 1, task: { title: "Task" } },
    ])
      await compare("/api/notify/task", { method: "POST", body, role });
  }
});

test("Hono preserves Resend payloads and provider errors with all network calls intercepted", async (t) => {
  const calls = [];
  let mode = "success";
  const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    calls.push({
      method: options.method,
      authorization: options.headers.authorization,
      body: JSON.parse(options.body),
    });
    if (mode === "throw") throw new Error("simulated provider failure");
    if (mode === "error")
      return Response.json({ message: "simulated rejection" }, { status: 429 });
    if (mode === "invalid-json")
      return new Response("unavailable", { status: 503 });
    return Response.json({ id: "test-email-id" });
  });
  const setup = (f) =>
    Object.assign(f.env, {
      RESEND_API_KEY: "test-only-key",
      EMAIL_FROM: "RMS Test <noreply@example.test>",
      RMS_URL: "https://rms.test",
    });
  try {
    for (const kind of ["ASSIGNED", "SUBMITTED", "APPROVED", "REVISION"]) {
      const start = calls.length;
      const result = await compare("/api/notify/task", {
        method: "POST",
        setup,
        body: {
          kind,
          toUserId: 1,
          task: {
            title: "Task <test>",
            projectId: "P-1",
            description: "A&B",
            startDate: "2026-10-16",
            due: "2026-10-20",
            reviewerName: "Reviewer",
            reviewNote: "Check <again>",
          },
        },
      });
      assert.deepEqual(result.data, { sent: true, id: "test-email-id" });
      assert.deepEqual(calls[start + 1], calls[start], "email payload changed");
      assert.match(calls[start].body.html, /Task &lt;test&gt;/);
    }
    for (mode of ["success", "error", "invalid-json", "throw"]) {
      const start = calls.length;
      await compare("/api/admin/email/test", {
        method: "POST",
        setup,
        body: { to: "recipient@example.test" },
      });
      assert.deepEqual(calls[start + 1], calls[start]);
    }
    await compare("/api/admin/email/test", {
      method: "POST",
      setup,
      body: { to: "invalid-address" },
    });
  } finally {
    mock.mock.restore();
  }
});

test("Hono keeps the login/password/logout lifecycle and rejects concurrent stale state writes", async () => {
  for (const worker of [original, migrated]) {
    const f = fixture();
    try {
      let activeCookie = "";
      let activeAccess = "";
      const request = (path, method = "GET", body) =>
        worker.fetch(
          new Request(origin + path, {
            method,
            headers: {
              cookie: activeCookie,
              ...(activeAccess
                ? { authorization: `Bearer ${activeAccess}` }
                : {}),
              "content-type": "application/json",
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          }),
          f.env,
        );
      const login = await request("/api/auth/login", "POST", {
        email: "super_admin@local.test",
        password: "local-test-password",
      });
      assert.equal(login.status, 200);
      activeCookie = login.headers.get("set-cookie").split(";")[0];
      if (worker === migrated) activeAccess = (await login.json()).accessToken;
      const token = decodeURIComponent(
        activeCookie.slice("rms_session=".length),
      );
      assert.ok(
        f.db
          .prepare("SELECT id FROM sessions WHERE token_hash=?")
          .get(createHash("sha256").update(token).digest("hex")),
      );
      assert.equal((await request("/api/auth/me")).status, 200);
      const state = JSON.parse(
        f.db.prepare("SELECT data FROM app_state").get().data,
      );
      state.unrecognizedProductionField = { keep: true };
      const saves = await Promise.all([
        request("/api/state", "PUT", { version: 1, data: state }),
        request("/api/state", "PUT", { version: 1, data: state }),
      ]);
      assert.deepEqual(saves.map((r) => r.status).sort(), [200, 409]);
      const saved = await (await request("/api/state")).json();
      assert.equal(saved.version, 2);
      assert.deepEqual(saved.data.unrecognizedProductionField, { keep: true });
      assert.equal(
        (
          await request("/api/auth/change-password", "POST", {
            oldPassword: "local-test-password",
            newPassword: "new-valid-password",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request("/api/auth/login", "POST", {
            email: "super_admin@local.test",
            password: "local-test-password",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request("/api/auth/login", "POST", {
            email: "super_admin@local.test",
            password: "new-valid-password",
          })
        ).status,
        200,
      );
      assert.equal((await request("/api/auth/logout", "POST", {})).status, 200);
      assert.equal((await request("/api/auth/me")).status, 401);
      assert.equal(
        f.db
          .prepare("SELECT id FROM sessions WHERE token_hash=?")
          .get(createHash("sha256").update(token).digest("hex")),
        undefined,
      );
    } finally {
      f.close();
    }
  }
});
