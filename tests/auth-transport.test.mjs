import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authenticatedFetch,
  acceptAuthentication,
  clearAccessToken,
} from "../web/src/lib/services/auth-token.js";

const auth = (token) => ({
  accessToken: token,
  tokenType: "Bearer",
  expiresIn: 900,
});
test("parallel frontend requests share one cookie refresh and explicitly carry Bearer", async (t) => {
  clearAccessToken();
  let refreshes = 0;
  const stub = t.mock.method(globalThis, "fetch", async (path, options) => {
    if (path === "/api/auth/refresh") {
      refreshes++;
      assert.equal(options.method, "POST");
      assert.equal(options.headers["x-rms-refresh"], "1");
      return Response.json(auth("new-access"));
    }
    assert.equal(
      new Headers(options.headers).get("authorization"),
      "Bearer new-access",
    );
    return Response.json({ ok: true });
  });
  try {
    await Promise.all(
      Array.from({ length: 10 }, () => authenticatedFetch("/api/state")),
    );
    assert.equal(refreshes, 1);
    await assert.rejects(
      () => authenticatedFetch("https://evil.test/api/state"),
      /origin RMS/,
    );
  } finally {
    clearAccessToken();
    stub.mock.restore();
  }
});

test("a rejected access token refreshes once and retries each protected request once", async (t) => {
  clearAccessToken();
  acceptAuthentication(auth("old-access"));
  let refreshes = 0;
  let retries = 0;
  const stub = t.mock.method(globalThis, "fetch", async (path, options) => {
    if (path === "/api/auth/refresh") {
      refreshes++;
      return Response.json(auth("new-access"));
    }
    if (
      new Headers(options.headers).get("authorization") === "Bearer old-access"
    )
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    retries++;
    return Response.json({ ok: true });
  });
  try {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => authenticatedFetch("/api/state")),
    );
    assert.ok(responses.every((r) => r.status === 200));
    assert.equal(refreshes, 1);
    assert.equal(retries, 8);
  } finally {
    clearAccessToken();
    stub.mock.restore();
  }
});

test("logout during an in-flight refresh cannot restore a cleared access token", async (t) => {
  clearAccessToken();
  let resolveRefresh;
  const stub = t.mock.method(
    globalThis,
    "fetch",
    () =>
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
  );
  try {
    const pending = authenticatedFetch("/api/state");
    clearAccessToken();
    resolveRefresh(Response.json(auth("stale-access")));
    await assert.rejects(pending, /Sesi berubah/);
  } finally {
    clearAccessToken();
    stub.mock.restore();
  }
});
