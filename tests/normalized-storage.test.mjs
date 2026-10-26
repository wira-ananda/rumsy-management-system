import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import worker from "../api/build/_worker.js";
import {
  models,
  encode,
  decode,
  sqlValue,
} from "../api/build/record-codec.mjs";
import { createMockBindings } from "./helpers/mock-bindings.mjs";
import { normalizeFixture } from "./helpers/normalized-fixture.mjs";
const token = "normalized-storage-access-".padEnd(43, "x"),
  headers = {
    authorization: "Bearer " + token,
    "content-type": "application/json",
  };
async function fixture(role = "SUPER_ADMIN") {
  const f = createMockBindings();
  const user = f.db
    .prepare("SELECT * FROM users WHERE role=? LIMIT 1")
    .get(role);
  f.db
    .prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    )
    .run("parent", user.id, "fixture-parent", "2099-01-01T00:00:00.000Z");
  f.db
    .prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    )
    .run(
      "access:parent:normalized",
      user.id,
      createHash("sha256").update(token).digest("hex"),
      "2099-01-01T00:00:00.000Z",
    );
  await normalizeFixture(f);
  return f;
}
const request = (f, path, options = {}) =>
  worker.fetch(
    new Request("https://rms.test/api/" + path, { headers, ...options }),
    f.env,
  );
async function state(f) {
  const response = await request(f, "state");
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
async function save(f, snapshot) {
  return request(f, "state", { method: "PUT", body: JSON.stringify(snapshot) });
}
test("lead commercial terms persist in Prisma, reject tampering, and preserve historical leads", async () => {
  const f = await fixture();
  try {
    const original = await state(f);
    const lead = {
      id: "LD-QUALIFIED",
      client: "Lead Baru",
      phone: "0812",
      location: "Makassar",
      need: "Other",
      needDetail: "Klinik",
      source: "WhatsApp",
      sales: "Arif",
      estRab: 500000000,
      margin: 8,
      dp: 25,
      dpAmount: 125000000,
      tenorYears: 5,
      collateral: "SHM",
      estGambar: 0,
      estAsstCr: 0,
      milestones: [],
      stage: "WARM",
    };
    for (const invalid of [
      { dp: 14, dpAmount: 70000000 },
      { margin: 9 },
      { dpAmount: 1 },
      { tenorYears: 16 },
      { tenorYears: 1.5 },
      { collateral: "" },
    ]) {
      const snapshot = structuredClone(original);
      snapshot.data.leads.push({ ...lead, ...invalid });
      const response = await save(f, snapshot);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, "LEAD_VALIDATION");
      assert.equal((await state(f)).version, original.version);
    }
    const valid = structuredClone(original);
    valid.data.leads.push(lead);
    assert.equal((await save(f, valid)).status, 200);
    const actual = await state(f);
    const persisted = actual.data.leads.find((l) => l.id === lead.id);
    assert.equal(persisted.dpAmount, 125000000);
    assert.equal(persisted.tenorYears, 5);
    assert.equal(persisted.collateral, "SHM");
    assert.equal(persisted.needDetail, "Klinik");
    assert.equal(
      f.db
        .prepare("SELECT dpAmount,tenorYears FROM rms_leads WHERE id=?")
        .get(lead.id).tenorYears,
      5,
    );
    for (const old of original.data.leads) {
      // Stage is re-evaluated by the existing whole-state pipeline on every save.
      const { stage: oldStage, ...previousValues } = old;
      const { stage: currentStage, ...currentValues } = actual.data.leads.find(
        (l) => l.id === old.id,
      );
      assert.deepEqual(currentValues, previousValues);
    }
    actual.data.leads[0].notes = "Catatan baru pada lead lama";
    assert.equal((await save(f, actual)).status, 200);
    const next = await state(f);
    const qualified = next.data.leads.find((l) => l.id === lead.id);
    qualified.dp = 15;
    qualified.dpAmount = 75000000;
    assert.equal((await save(f, next)).status, 200);
    const minimum = await state(f);
    assert.equal(minimum.data.leads.find((l) => l.id === lead.id).dp, 15);
    assert.equal(
      minimum.data.leads.find((l) => l.id === lead.id).dpAmount,
      75000000,
    );
    for (const old of original.data.projects) {
      const current = minimum.data.projects.find((p) => p.id === old.id);
      assert.deepEqual(current.contract, old.contract);
      assert.equal(current.originalContract, old.originalContract);
      assert.deepEqual(current.transactions, old.transactions);
      assert.deepEqual(current.installments, old.installments);
    }
    minimum.data.leads.find((l) => l.id === lead.id).margin = 3;
    assert.equal((await save(f, minimum)).status, 400);
  } finally {
    f.close();
  }
});
test("normalized Prisma reads match legacy JSON exactly and public portal matches legacy output", async () => {
  const f = await fixture();
  try {
    const actual = await state(f),
      original = JSON.parse(
        f.db.prepare("SELECT data FROM app_state").get().data,
      );
    assert.deepEqual(actual.data, original);
    const normalized = await (
      await request(f, "client/project?token=" + f.token)
    ).json();
    f.env.RMS_STORAGE = "legacy";
    const legacy = await (
      await request(f, "client/project?token=" + f.token)
    ).json();
    assert.deepEqual(normalized, legacy);
  } finally {
    f.close();
  }
});
test("normalized write updates individual rows; legacy archive, users and files remain unchanged", async () => {
  const f = await fixture();
  try {
    const warmup = await state(f);
    assert.equal((await save(f, warmup)).status, 200);
    const before = f.db.prepare("SELECT * FROM app_state").get(),
      snapshot = await state(f);
    f.db.exec(
      "CREATE TABLE test_changed(model TEXT);CREATE TRIGGER test_leads_update AFTER UPDATE ON rms_leads BEGIN INSERT INTO test_changed VALUES('Lead'); END;CREATE TRIGGER test_clients_update AFTER UPDATE ON rms_clients BEGIN INSERT INTO test_changed VALUES('Client'); END;",
    );
    snapshot.data.clients[0].notes = "edited with normalized storage";
    snapshot.data.clients[0].futureField = { a: [false, null, ""] };
    const response = await save(f, snapshot);
    assert.equal(response.status, 200, await response.clone().text());
    const after = await state(f);
    assert.equal(after.data.clients[0].notes, "edited with normalized storage");
    assert.deepEqual(after.data.clients[0].futureField, {
      a: [false, null, ""],
    });
    assert.equal(after.version, snapshot.version + 1);
    assert.deepEqual(f.db.prepare("SELECT * FROM app_state").get(), before);
    assert.deepEqual(
      f.db
        .prepare("SELECT * FROM test_changed")
        .all()
        .map((r) => r.model),
      ["Client"],
    );
  } finally {
    f.close();
  }
});
test("normalized CAS rejects stale snapshots without partial updates", async () => {
  const f = await fixture();
  try {
    const first = await state(f),
      second = structuredClone(first);
    first.data.clients[0].notes = "winner";
    second.data.clients[0].notes = "stale";
    assert.equal((await save(f, first)).status, 200);
    assert.equal((await save(f, second)).status, 409);
    assert.equal((await state(f)).data.clients[0].notes, "winner");
  } finally {
    f.close();
  }
});
test("normalized payment role guards and Bearer restrictions remain enforced", async () => {
  const f = await fixture("SALES_EXECUTIVE");
  try {
    const snapshot = await state(f),
      payment = snapshot.data.projects[0].transactions.find(
        (t) => t.status === "VERIFIED",
      ),
      amount = payment.amount;
    payment.amount = 1;
    payment.status = "REJECTED";
    assert.equal((await save(f, snapshot)).status, 200);
    const actual = (await state(f)).data.projects[0].transactions.find(
      (t) => t.id === payment.id,
    );
    assert.equal(actual.amount, amount);
    assert.equal(actual.status, "VERIFIED");
    assert.equal(
      (
        await worker.fetch(
          new Request("https://rms.test/api/state", {
            headers: { cookie: "rms_session=fixture-parent" },
          }),
          f.env,
        )
      ).status,
      401,
    );
  } finally {
    f.close();
  }
});
test("normalized decoder preserves absent/null/type differences, duplicate children and unknown fields", async () => {
  const value = {
    clients: [
      { id: "client", name: "same", newField: { deep: [1, null, true] } },
    ],
    projects: [
      {
        id: "p",
        clientId: "client",
        salesUserId: 8,
        originalContract: 133770610995,
        contract: null,
        chat: [
          { id: "duplicate", at: 0, text: "a" },
          { id: "duplicate", at: 0, text: "b" },
        ],
        activity: [
          { at: "same", text: "same" },
          { at: "same", text: "same" },
        ],
        progressDaily: [
          {
            id: "daily",
            published: false,
            photos: [{ id: "photo", caption: null }],
          },
        ],
      },
    ],
    audit: [{ at: "same" }, { at: "same" }],
    newRoot: { retained: true },
    leads: [],
    tasks: [],
  };
  const encoded = await encode(value);
  assert.deepEqual(
    decode(encoded.records, encoded.root, encoded.rootShape),
    value,
  );
  assert.equal(encoded.records.ProjectActivity.length, 2);
  assert.equal(
    new Set(encoded.records.ProjectChat.map((r) => r.storageKey)).size,
    2,
  );
  const project = encoded.records.Project[0];
  project.name = "new schema column";
  assert.equal(
    decode(encoded.records, encoded.root, encoded.rootShape).projects[0].name,
    "new schema column",
  );
});
test("normalized opt-in fails closed if migration marker is absent, instead of reverting to stale archive", async () => {
  const f = await fixture();
  try {
    f.db.exec("DELETE FROM rms_storage_meta");
    const response = await request(f, "state");
    assert.equal(response.status, 500);
    assert.match((await response.json()).message, /not been migrated/);
  } finally {
    f.close();
  }
});
test("D1 atomic write rolls back the CAS marker and all earlier updates on a constraint error", async () => {
  const f = await fixture();
  try {
    const snapshot = await state(f),
      before = f.db.prepare("SELECT * FROM rms_storage_meta").get();
    f.db.exec(
      "CREATE TRIGGER test_block_client BEFORE UPDATE ON rms_clients BEGIN SELECT RAISE(ABORT,'test constraint'); END;",
    );
    snapshot.data.clients[0].notes = "must rollback";
    assert.equal((await save(f, snapshot)).status, 500);
    assert.deepEqual(
      f.db.prepare("SELECT * FROM rms_storage_meta").get(),
      before,
    );
    assert.notEqual((await state(f)).data.clients[0].notes, "must rollback");
  } finally {
    f.close();
  }
});

test("simultaneous normalized writers commit one snapshot and reject the other", async () => {
  const f = await fixture();
  try {
    const a = await state(f),
      b = structuredClone(a);
    a.data.clients[0].notes = "writer A";
    b.data.clients[0].notes = "writer B";
    const result = await Promise.all([save(f, a), save(f, b)]);
    assert.deepEqual(result.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await state(f)).version, a.version + 1);
    assert.deepEqual(f.db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    f.close();
  }
});
test("promoting an unknown field into the Prisma schema preserves its legacy value before backfill", async () => {
  const value = { clients: [{ id: "c", taxId: "existing-identifier" }] },
    encoded = await encode(value),
    client = models.find((m) => m.name === "Client");
  try {
    client.fields.taxId = "String";
    encoded.records.Client[0].taxId = null;
    assert.deepEqual(
      decode(encoded.records, encoded.root, encoded.rootShape),
      value,
    );
  } finally {
    delete client.fields.taxId;
  }
});
