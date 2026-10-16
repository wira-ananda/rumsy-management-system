import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { sqliteD1 } from "../../tests/helpers/sqlite-d1.mjs";
import worker from "../../api/build/_worker.js";
const root = resolve(import.meta.dirname, "../.."),
  current = JSON.parse(
    await readFile(resolve(root, "api/.local/current.json"), "utf8"),
  );
// The API exercise uses a disposable local copy, including its sessions/audit writes.
const temp = resolve(current.directory, "runtime-check.sqlite");
await writeFile(temp, await readFile(current.database), { mode: 0o600 });
const db = new DatabaseSync(temp);
try {
  const source = JSON.parse(
    db.prepare("SELECT data FROM app_state WHERE id=1").get().data,
  );
  const user = db
    .prepare(
      "SELECT id FROM users WHERE role='SUPER_ADMIN' AND active=1 LIMIT 1",
    )
    .get();
  assert.ok(user, "Active Super Admin is required for parity verification");
  const parent = "local-migration-check",
    token = randomBytes(32).toString("base64url"),
    expires = "2099-01-01T00:00:00.000Z";
  db.prepare(
    "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
  ).run(parent, user.id, randomBytes(32).toString("hex"), expires);
  db.prepare(
    "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
  ).run(
    "access:" + parent + ":test",
    user.id,
    createHash("sha256").update(token).digest("hex"),
    expires,
  );
  const env = { DB: sqliteD1(db), RMS_STORAGE: "normalized" },
    headers = {
      authorization: "Bearer " + token,
      "content-type": "application/json",
    };
  const request = (path, options = {}) =>
    worker.fetch(
      new Request("https://local-migration.test/api/" + path, {
        headers,
        ...options,
      }),
      env,
    );
  const response = await request("state");
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.deepEqual(snapshot.data, source);
  const archive = db
    .prepare("SELECT data FROM app_state WHERE id=1")
    .get().data;
  const originalNote = snapshot.data.clients[0].notes;
  snapshot.data.clients[0].notes = "LOCAL RUNTIME VERIFICATION";
  const saved = await request("state", {
    method: "PUT",
    body: JSON.stringify(snapshot),
  });
  assert.equal(saved.status, 200, await saved.clone().text());
  const actual = await (await request("state")).json();
  assert.equal(actual.data.clients[0].notes, "LOCAL RUNTIME VERIFICATION");
  assert.equal(
    db.prepare("SELECT data FROM app_state WHERE id=1").get().data,
    archive,
  );
  assert.equal(
    (await request("state", { method: "PUT", body: JSON.stringify(snapshot) }))
      .status,
    409,
  );
  let portals = 0;
  for (const p of source.projects.filter(
    (p) => p.clientPortal?.enabled && p.clientPortal?.token,
  )) {
    const normalized = await request(
      "client/project?token=" + encodeURIComponent(p.clientPortal.token),
    );
    env.RMS_STORAGE = "legacy";
    const legacy = await request(
      "client/project?token=" + encodeURIComponent(p.clientPortal.token),
    );
    env.RMS_STORAGE = "normalized";
    assert.equal(normalized.status, legacy.status);
    assert.deepEqual(await normalized.json(), await legacy.json());
    portals++;
  }
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  const reportPath = resolve(current.directory, "verification.json"),
    report = JSON.parse(await readFile(reportPath, "utf8"));
  report.checks.prismaRuntimeExactRead = true;
  report.checks.normalizedApiWrite = true;
  report.checks.staleWriteRejected = true;
  report.checks.portalParity = portals;
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(
    JSON.stringify(
      {
        status: "PRISMA_RUNTIME_VERIFIED",
        exactRead: true,
        writeAndConflict: true,
        portalLinksCompared: portals,
        productionModified: false,
      },
      null,
      2,
    ),
  );
} finally {
  db.close();
  await unlink(temp);
}
