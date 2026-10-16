import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../api/build/_worker.js";
import { createMockBindings } from "./helpers/mock-bindings.mjs";

test("maintenance blocks all mutating routes before authentication, file I/O and session writes", async () => {
  const f = createMockBindings();
  const tables = ["app_state", "users", "sessions", "files", "server_audit"];
  const snapshot = () =>
    Object.fromEntries(
      tables.map((table) => [
        table,
        f.db.prepare(`SELECT * FROM ${table}`).all(),
      ]),
    );
  try {
    f.env.RMS_MAINTENANCE = "1";
    const before = snapshot(),
      objects = [...f.files.entries()];
    for (const [method, path] of [
      ["POST", "auth/login"],
      ["POST", "auth/refresh"],
      ["POST", "auth/logout"],
      ["POST", "auth/change-password"],
      ["PUT", "state"],
      ["POST", "files"],
      ["DELETE", "files/test-photo-1"],
      ["POST", "admin/users"],
      ["PATCH", "admin/users/1"],
      ["POST", "notify/task"],
      ["POST", "admin/email/test"],
    ]) {
      const response = await worker.fetch(
        new Request("https://rms.test/api/" + path, {
          method,
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
        f.env,
      );
      assert.equal(response.status, 503, method + " " + path);
      assert.equal(response.headers.get("retry-after"), "60");
      assert.equal((await response.json()).error, "MAINTENANCE");
    }
    assert.deepEqual(snapshot(), before);
    assert.deepEqual([...f.files.entries()], objects);
    assert.equal(
      (await worker.fetch(new Request("https://rms.test/api/health"), f.env))
        .status,
      200,
    );
    assert.equal(
      (await worker.fetch(new Request("https://rms.test/api/state"), f.env))
        .status,
      401,
    );
  } finally {
    f.close();
  }
});

test("maintenance is off by default and resumes the normal auth contract when disabled", async () => {
  const f = createMockBindings();
  try {
    for (const flag of [undefined, "0"]) {
      f.env.RMS_MAINTENANCE = flag;
      const response = await worker.fetch(
        new Request("https://rms.test/api/state", {
          method: "PUT",
          body: "{}",
        }),
        f.env,
      );
      assert.equal(response.status, 401);
    }
  } finally {
    f.close();
  }
});
