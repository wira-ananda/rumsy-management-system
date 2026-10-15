import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, webcrypto } from "node:crypto";
import vm from "node:vm";
import { parse } from "acorn";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(
  resolve(root, "baseline/original/app.js"),
  "utf8",
);
const ast = parse(source, { ecmaVersion: "latest" });
const declarations = ast.body[0].expression.callee.body.body;
const functionNames = declarations
  .filter((n) => n.type === "FunctionDeclaration")
  .map((n) => n.id.name);
const exportsCode = `globalThis.original={${functionNames.join(",")},seed,nav,projectTabs,roles,setData(x){data=x},getData(){return data},setSession(x){session=x},setUsers(x){userDirectory=x}};`;
const NativeDate = globalThis.Date;
class FrozenDate extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : ["2026-10-15T08:00:00Z"]));
  }
  static now() {
    return new NativeDate("2026-10-15T08:00:00Z").getTime();
  }
}
globalThis.Date = FrozenDate;
function element() {
  return {
    value: "",
    innerHTML: "",
    textContent: "",
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    removeEventListener() {},
    remove() {},
    focus() {},
    querySelector() {
      return element();
    },
    querySelectorAll() {
      return [];
    },
  };
}
function dom() {
  const nodes = new Map();
  return {
    nodes,
    document: {
      querySelector(key) {
        if (!nodes.has(key)) nodes.set(key, element());
        return nodes.get(key);
      },
      querySelectorAll() {
        return [];
      },
      getElementById(key) {
        return this.querySelector("#" + key);
      },
      createElement: element,
      body: { appendChild() {} },
    },
  };
}
const oldDOM = dom();
const globalMocks = {
  Date: FrozenDate,
  console,
  TextEncoder,
  crypto: webcrypto,
  Request,
  Response,
  Headers,
  FormData,
  File,
  location: { hash: "", origin: "https://rms.test" },
  window: {},
  navigator: { clipboard: { writeText: async () => {} } },
  setTimeout() {},
  alert() {},
  confirm() {
    return false;
  },
  fetch: async () =>
    new Response(JSON.stringify({ version: 1, users: [], configured: false }), {
      headers: { "content-type": "application/json" },
    }),
};
const oldContext = vm.createContext({
  ...globalMocks,
  document: oldDOM.document,
});
vm.runInContext(
  source.replace("boot();\n})();", exportsCode + "\n})();"),
  oldContext,
);
const original = oldContext.original;
const imported = {};
async function collect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const full = resolve(directory, item.name);
    if (item.isDirectory()) await collect(full);
    else if (item.name.endsWith(".js"))
      Object.assign(imported, await import(full));
  }
}
await collect(resolve(root, "web/src/lib"));
const { runtime } = imported;
const clone = (x) => JSON.parse(JSON.stringify(x));
const users = Object.entries(original.roles).map(([role, name], i) => ({
  id: i + 1,
  role,
  name,
  scopeName: name,
  email: role.toLowerCase() + "@local.test",
}));
users.push(
  {
    id: 40,
    role: "SALES_EXECUTIVE",
    name: "Arif",
    scopeName: "Arif",
    email: "arif@local.test",
  },
  {
    id: 41,
    role: "SALES_EXECUTIVE",
    name: "Fadlan",
    scopeName: "Fadlan",
    email: "fadlan@local.test",
  },
);
const session = users.find((x) => x.role === "SUPER_ADMIN");
function reset(role = session.role) {
  const newDOM = dom();
  Object.assign(globalThis, {
    document: newDOM.document,
    location: globalMocks.location,
    window: {},
    alert: globalMocks.alert,
    confirm: globalMocks.confirm,
    fetch: globalMocks.fetch,
  });
  const u = users.find((x) => x.role === role);
  runtime.data = clone(original.seed);
  runtime.session = clone(u);
  runtime.userDirectory = clone(users);
  runtime.salesDirectory = clone(
    users.filter((x) => x.role === "SALES_EXECUTIVE"),
  );
  runtime.stateVersion = 1;
  runtime.saveChain = Promise.resolve();
  original.setData(clone(original.seed));
  original.setSession(clone(u));
  original.setUsers(clone(users));
  // Sales directory is also required by lead forms; original boot is intentionally not run.
  vm.runInContext("void 0", oldContext);
  imported.ensureDataShape();
  original.ensureDataShape();
  oldDOM.nodes.clear();
  newDOM.nodes.clear();
  return newDOM;
}
function snapshot(view, nodes) {
  return {
    html: view.innerHTML,
    children: [...nodes]
      .map(([key, node]) => [key, node.innerHTML])
      .sort(([a], [b]) => a.localeCompare(b)),
  };
}

test("backend and styles remain byte-identical to the original package", async () => {
  const checksums = JSON.parse(
    await readFile(resolve(root, "baseline/checksums.json"), "utf8"),
  );
  const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");
  assert.equal(
    digest(await readFile(resolve(root, "_worker.js"))),
    checksums["_worker.js"],
  );
  assert.equal(
    digest(await readFile(resolve(root, "web/src/routes/layout.css"))),
    checksums["styles.css"],
  );
});
test("normalization retains existing JSON shape and unknown fields", () => {
  reset();
  assert.deepEqual(clone(runtime.data), clone(original.getData()));
  runtime.data.externalField = { retained: true };
  imported.ensureDataShape();
  assert.deepEqual(runtime.data.externalField, { retained: true });
});
test("all menu and dossier routes have native Svelte components", async () => {
  const registry = await readFile(
    resolve(root, "web/src/lib/features/registry.ts"),
    "utf8",
  );
  const tabs = await readFile(
    resolve(root, "web/src/lib/components/projects/tabs/index.ts"),
    "utf8",
  );
  assert.deepEqual(clone(imported.nav), clone(original.nav));
  assert.deepEqual(clone(imported.projectTabs), clone(original.projectTabs));
  for (const item of original.nav)
    assert.ok(new RegExp(`"?${item.route}"?\\s*:`).test(registry), item.route);
  for (const tab of original.projectTabs) assert.ok(tabs.includes(tab), tab);
});
test("frontend templates do not regress to imperative HTML renderers", async () => {
  const files = [];
  async function scan(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = resolve(dir, e.name);
      if (e.isDirectory()) await scan(p);
      else if (/\.(svelte|js|ts)$/.test(p)) files.push(p);
    }
  }
  await scan(resolve(root, "web/src"));
  assert.ok(files.filter((p) => p.endsWith(".svelte")).length >= 65);
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(
      content,
      /innerHTML|outerHTML|insertAdjacentHTML|\{@html|querySelector|\.onclick\s*=|\.onsubmit\s*=/,
      file,
    );
  }
});
test("contract, payment, installment, and visibility rules match baseline", () => {
  reset();
  for (const p of runtime.data.projects) {
    const old = original.getData().projects.find((x) => x.id === p.id);
    for (const fn of ["currentContract", "verifiedPaid"])
      assert.equal(imported[fn](p), original[fn](old));
    for (const i of p.installments) {
      const oi = old.installments.find((x) => x.id === i.id);
      for (const fn of ["installmentPaid", "installmentStatus"])
        assert.equal(imported[fn](p, i), original[fn](old, oi));
    }
  }
  for (const role of Object.keys(original.roles)) {
    reset(role);
    assert.deepEqual(
      clone(imported.visibleLeads()),
      clone(original.visibleLeads()),
    );
    assert.deepEqual(
      clone(imported.visibleProjects()),
      clone(original.visibleProjects()),
    );
  }
});
test("pipeline decisions match across stages, payment states and completion gates", () => {
  reset();
  for (const lead of original.seed.leads)
    for (const project of [null, ...original.seed.projects]) {
      assert.equal(
        imported.derivePipelineStage(clone(lead), clone(project)),
        original.derivePipelineStage(clone(lead), clone(project)),
      );
    }
});
test("whole-state saves keep the same payload and version contract", async () => {
  reset();
  runtime.data.unknownExistingRecord = { nested: ["do not migrate"] };
  const before = clone(runtime.data);
  let call;
  globalThis.fetch = async (path, options) => {
    call = { path, options };
    return new Response(JSON.stringify({ ok: true, version: 2 }));
  };
  await imported.save();
  assert.equal(call.path, "/api/state");
  assert.equal(call.options.method, "PUT");
  assert.deepEqual(JSON.parse(call.options.body), { version: 1, data: before });
  assert.equal(runtime.stateVersion, 2);
  assert.equal(call.options.credentials, "same-origin");
});
test("original known workflow quirks are retained rather than silently fixed", () => {
  reset();
  const before = original
    .runSelfTests()
    .filter(
      (x) =>
        ![
          "Tab Chat dirender oleh projectChat",
          "Kanban hanya read-only (tidak ada handler drag)",
        ].includes(x.name),
    )
    .map((x) => ({ name: x.name, ok: x.ok }));
  const after = imported
    .runSelfTests()
    .map((x) => ({ name: x.name, ok: x.ok }));
  assert.deepEqual(clone(after), clone(before));
});
