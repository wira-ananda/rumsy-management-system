import { localPaths } from "./local-paths.mjs";
/** Real backup data, local copy only; no Cloudflare/Resend credentials. */
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { sqliteD1 } from "../../tests/helpers/sqlite-d1.mjs";
import worker from "../../api/build/_worker.js";
const current = await localPaths();
if (!current.files)
  throw new Error(
    "Run db:prepare again to record the read-only R2 backup path.",
  );
const runtime = resolve(current.directory, "runtime"),
  database = current.development;
await mkdir(resolve(runtime, "objects"), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(database);
db.exec("PRAGMA foreign_keys=ON");
const safePath = (base, key) => {
  const file = resolve(base, key),
    path = relative(base, file);
  if (path === ".." || path.startsWith(".." + sep) || isAbsolute(path))
    throw new Error("Invalid object path");
  return file;
};
const overlay = resolve(runtime, "objects"),
  deleted = new Set();
const env = {
  DB: sqliteD1(db),
  RMS_STORAGE: "normalized",
  FILES: {
    async put(key, body) {
      const path = safePath(overlay, key);
      await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(
        path,
        Buffer.from(await new Response(body).arrayBuffer()),
        { mode: 0o600 },
      );
      deleted.delete(key);
    },
    async get(key) {
      if (deleted.has(key)) return null;
      let body;
      try {
        body = await readFile(safePath(overlay, key));
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
        try {
          body = await readFile(safePath(current.files, key));
        } catch (e) {
          if (e.code === "ENOENT") return null;
          throw e;
        }
      }
      const file = db
        .prepare("SELECT content_type FROM files WHERE object_key=?")
        .get(key);
      return {
        body,
        writeHttpMetadata(headers) {
          headers.set(
            "content-type",
            file?.content_type || "application/octet-stream",
          );
        },
      };
    },
    async delete(key) {
      deleted.add(key);
    },
  },
  ASSETS: { fetch: () => new Response("Local API only", { status: 404 }) },
};
const port = Number(process.env.RMS_LOCAL_PORT || 8790);
const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const method = req.method || "GET";
    const response = await worker.fetch(
      new Request("http://127.0.0.1:" + port + req.url, {
        method,
        headers: req.headers,
        ...(!["GET", "HEAD"].includes(method)
          ? { body: Buffer.concat(chunks) }
          : {}),
      }),
      env,
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Local API error");
  }
});
server.on("error", (error) => {
  console.error(error.message);
  db.close();
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Local migrated backup API: http://127.0.0.1:${port}\nDatabase copy: ${database}\nOriginal SQL/R2 backups and Cloudflare production are not modified. Email is disabled.`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
