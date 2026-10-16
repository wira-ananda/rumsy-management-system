/** Test-only backend. All D1/R2 state lives in memory. Never deploy this server. */
import { createServer } from "node:http";
import worker from "../api/build/_worker.js";
import { resolve } from "node:path";
import { normalizeFixture } from "./helpers/normalized-fixture.mjs";
import { createMockBindings } from "./helpers/mock-bindings.mjs";

const port = Number(process.env.RMS_TEST_PORT || 8788);
const staticRoot = process.env.RMS_TEST_STATIC_ROOT
  ? resolve(process.env.RMS_TEST_STATIC_ROOT)
  : null;

const bindings = createMockBindings(staticRoot);
const { env, token } = bindings;
const reset = async () => {
  bindings.reset();
  if (process.env.RMS_TEST_STORAGE === "normalized")
    await normalizeFixture(bindings);
};
await reset();
const server = createServer(async (req, res) => {
  try {
    const url = "http://127.0.0.1:" + port + req.url;
    if (req.url === "/__test/reset" && req.method === "POST") {
      await reset();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, token }));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const method = req.method || "GET";
    const request = new Request(url, {
      method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(method)
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end(String(error));
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log("Test-only in-memory Worker API: http://127.0.0.1:" + port),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      bindings.close();
      process.exit(0);
    }),
  );
