import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../api/build/_worker.js";
import { createMockBindings } from "./helpers/mock-bindings.mjs";

const origin = "https://rms.test";
const hash = (value) => createHash("sha256").update(value).digest("hex");
function client(f) {
  return (path, { method = "GET", body, headers = {} } = {}) =>
    worker.fetch(
      new Request(origin + path, {
        method,
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      f.env,
    );
}
async function login(send, email = "super_admin@local.test") {
  const response = await send("/api/auth/login", {
    method: "POST",
    body: { email, password: "local-test-password" },
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const body = await response.json();
  assert.equal(body.tokenType, "Bearer");
  assert.match(body.accessToken, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(body.expiresIn > 0 && body.expiresIn <= 900);
  return {
    ...body,
    cookie,
    headers: { authorization: `Bearer ${body.accessToken}` },
  };
}

test("internal data requires Bearer even with a valid login cookie or query token", async () => {
  const f = createMockBindings();
  const send = client(f);
  try {
    const session = await login(send);
    const rawRefresh = decodeURIComponent(session.cookie.split("=")[1]);
    assert.notEqual(session.accessToken, rawRefresh);
    const rows = f.db.prepare("SELECT token_hash FROM sessions").all();
    assert.ok(rows.some((r) => r.token_hash === hash(session.accessToken)));
    assert.ok(rows.some((r) => r.token_hash === hash(rawRefresh)));
    assert.ok(!JSON.stringify(rows).includes(session.accessToken));
    for (const path of [
      "/api/directory/users",
      "/api/directory/sales",
      "/api/state",
      "/api/admin/users",
      "/api/admin/email/status",
      "/api/auth/me",
      "/api/files/test-photo-1",
    ]) {
      for (const headers of [
        {},
        { cookie: session.cookie },
        { authorization: `Bearer ${rawRefresh}` },
        { authorization: "Bearer malformed" },
      ]) {
        const response = await send(path, { headers });
        assert.equal(response.status, 401, path);
        assert.deepEqual(await response.json(), { error: "UNAUTHENTICATED" });
      }
      assert.equal(
        (
          await send(path + "?access_token=" + session.accessToken, {
            headers: { cookie: session.cookie },
          })
        ).status,
        401,
      );
      assert.equal(
        (await send(path, { headers: session.headers })).status,
        200,
        path,
      );
    }
    assert.equal((await send("/api/health")).status, 200);
    assert.equal(
      (await send("/api/auth/refresh", { headers: { cookie: session.cookie } }))
        .status,
      401,
    );
    const asset = await send("/api/files/test-photo-1", {
      headers: session.headers,
    });
    assert.equal(asset.headers.get("cache-control"), "private, no-store");
    assert.ok((await asset.arrayBuffer()).byteLength > 0);
  } finally {
    f.close();
  }
});

test("refresh is POST-only, rejects foreign origins and requires its explicit header", async () => {
  const f = createMockBindings();
  const send = client(f);
  try {
    const session = await login(send);
    const headers = { cookie: session.cookie, "x-rms-refresh": "1", origin };
    const before = f.db
      .prepare("SELECT count(*) AS total FROM sessions")
      .get().total;
    for (const changed of [
      { origin: "https://evil.test" },
      { origin: "null" },
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "same-site" },
    ]) {
      assert.equal(
        (
          await send("/api/auth/refresh", {
            method: "POST",
            headers: { ...headers, ...changed },
            body: {},
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await send("/api/auth/login", {
            method: "POST",
            headers: changed,
            body: {
              email: "super_admin@local.test",
              password: "local-test-password",
            },
          })
        ).status,
        403,
      );
    }
    assert.equal(
      f.db.prepare("SELECT count(*) AS total FROM sessions").get().total,
      before,
    );
    assert.equal(
      (
        await send("/api/auth/refresh", {
          method: "POST",
          headers: { cookie: session.cookie },
          body: {},
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await send("/api/auth/refresh", {
          method: "POST",
          headers: { "x-rms-refresh": "1" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await send("/api/auth/refresh", {
          method: "POST",
          headers: { ...headers, cookie: "rms_session=%E0%A4%A" },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await send("/api/auth/refresh", {
          method: "POST",
          headers: { ...headers, cookie: "rms_session=" + session.accessToken },
        })
      ).status,
      401,
    );
    const refreshed = await send("/api/auth/refresh", {
      method: "POST",
      headers: { ...headers, "sec-fetch-site": "same-origin" },
      body: {},
    });
    assert.equal(refreshed.status, 200);
    const next = await refreshed.json();
    assert.notEqual(next.accessToken, session.accessToken);
    assert.equal(
      (
        await send("/api/state", {
          headers: { authorization: `Bearer ${next.accessToken}` },
        })
      ).status,
      200,
    );
    const preflight = await send("/api/auth/refresh", {
      method: "OPTIONS",
      headers: {
        origin: "https://evil.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "x-rms-refresh",
      },
    });
    assert.equal(preflight.headers.get("access-control-allow-origin"), null);
  } finally {
    f.close();
  }
});

test("existing sessions can restore the app but cannot authenticate data endpoints directly", async () => {
  const f = createMockBindings();
  const send = client(f);
  try {
    const oldToken = "existing-rms-cookie-before-bearer-migration";
    f.db
      .prepare(
        "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
      )
      .run("legacy-session", 1, hash(oldToken), "2099-01-01T00:00:00Z");
    const cookie = "rms_session=" + oldToken;
    assert.equal(
      (await send("/api/directory/users", { headers: { cookie } })).status,
      401,
    );
    const response = await send("/api/auth/refresh", {
      method: "POST",
      headers: { cookie, "x-rms-refresh": "1" },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(
      (
        await send("/api/directory/users", {
          headers: { authorization: `Bearer ${body.accessToken}` },
        })
      ).status,
      200,
    );
  } finally {
    f.close();
  }
});

test("expired access/parent sessions, disabled users and tampered tokens are denied immediately", async () => {
  for (const scenario of ["access", "parent", "inactive", "tampered"]) {
    const f = createMockBindings();
    const send = client(f);
    try {
      const session = await login(send);
      const expiry = new Date(Date.now() - 120000).toISOString();
      if (scenario === "access")
        f.db
          .prepare("UPDATE sessions SET expires_at=? WHERE token_hash=?")
          .run(expiry, hash(session.accessToken));
      if (scenario === "parent")
        f.db
          .prepare("UPDATE sessions SET expires_at=? WHERE id NOT LIKE ?")
          .run(expiry, "access:%");
      if (scenario === "inactive")
        f.db
          .prepare("UPDATE users SET active=0 WHERE id=?")
          .run(session.user.id);
      if (scenario === "tampered")
        session.headers.authorization =
          "Bearer " +
          (session.accessToken[0] === "a" ? "b" : "a") +
          session.accessToken.slice(1);
      assert.equal(
        (await send("/api/state", { headers: session.headers })).status,
        401,
        scenario,
      );
    } finally {
      f.close();
    }
  }
});

test("logout revokes its refresh/access family while preserving another device session", async () => {
  const f = createMockBindings();
  const send = client(f);
  try {
    const one = await login(send);
    const two = await login(send);
    const refreshed = await (
      await send("/api/auth/refresh", {
        method: "POST",
        headers: { cookie: one.cookie, "x-rms-refresh": "1" },
      })
    ).json();
    const result = await send("/api/auth/logout", {
      method: "POST",
      headers: one.headers,
      body: {},
    });
    assert.equal(result.status, 200);
    assert.match(result.headers.get("set-cookie"), /Max-Age=0/);
    for (const token of [one.accessToken, refreshed.accessToken])
      assert.equal(
        (
          await send("/api/state", {
            headers: { authorization: `Bearer ${token}` },
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await send("/api/auth/refresh", {
          method: "POST",
          headers: { cookie: one.cookie, "x-rms-refresh": "1" },
        })
      ).status,
      401,
    );
    assert.equal(
      (await send("/api/state", { headers: two.headers })).status,
      200,
    );
  } finally {
    f.close();
  }
});
