import { DatabaseSync } from "node:sqlite";
import { pbkdf2Sync } from "node:crypto";
import { seed } from "../seed.mjs";
import { roles } from "../../web/src/lib/constants/catalog.js";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

export function createMockBindings(staticRoot = null) {
  let db;
  const files = new Map();
  const token = "rms-local-test-client-token-00000000000000000000000000000000";
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6uAAAAABJRU5ErkJggg==",
    "base64",
  );
  function reset() {
    db?.close();
    db = new DatabaseSync(":memory:");
    files.clear();
    db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE,full_name TEXT,role TEXT,scope_name TEXT,password_hash TEXT,password_salt TEXT,password_iterations INTEGER,active INTEGER DEFAULT 1,must_change_password INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE sessions(id TEXT PRIMARY KEY,user_id INTEGER,token_hash TEXT,expires_at TEXT);
    CREATE TABLE app_state(id INTEGER PRIMARY KEY,version INTEGER,data TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE files(id TEXT PRIMARY KEY,object_key TEXT,original_name TEXT,content_type TEXT,size INTEGER,entity_type TEXT,entity_id TEXT,uploaded_by INTEGER);
    CREATE TABLE server_audit(id INTEGER PRIMARY KEY,user_id INTEGER,action TEXT,detail TEXT,ip TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
    const salt = "0123456789abcdef0123456789abcdef";
    const hash = pbkdf2Sync(
      "local-test-password",
      Buffer.from(salt, "hex"),
      100000,
      32,
      "sha256",
    ).toString("hex");
    for (const [role, name] of Object.entries(roles))
      db.prepare(
        "INSERT INTO users(email,full_name,role,scope_name,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,?,?,?)",
      ).run(
        role.toLowerCase() + "@local.test",
        name,
        role,
        name,
        hash,
        salt,
        100000,
      );
    for (const name of ["Arif", "Fadlan", "Elnawan"])
      db.prepare(
        "INSERT INTO users(email,full_name,role,scope_name,password_hash,password_salt,password_iterations) VALUES(?,?,?,?,?,?,?)",
      ).run(
        name.toLowerCase() + "@local.test",
        name,
        "SALES_EXECUTIVE",
        name,
        hash,
        salt,
        100000,
      );
    const state = structuredClone(seed),
      p = state.projects[0];
    p.clientPortal = {
      enabled: true,
      token,
      createdAt: new Date().toISOString(),
    };
    const photos = ["test-photo-1", "test-photo-2", "test-photo-3"].map(
      (id) => ({ id, name: id + ".png" }),
    );
    for (const photo of photos) {
      files.set(photo.id, {
        body: image,
        httpMetadata: { contentType: "image/png" },
      });
      db.prepare(
        "INSERT INTO files(id,object_key,original_name,content_type,size,entity_type,entity_id,uploaded_by) VALUES(?,?,?,?,?,?,?,?)",
      ).run(
        photo.id,
        photo.id,
        photo.name,
        "image/png",
        image.length,
        "PROGRESS_DAILY",
        p.id,
        1,
      );
    }
    p.progressDaily = [
      {
        id: "DAILY-PUBLIC",
        date: "2026-10-15",
        progress: 18,
        activities: "Laporan publik untuk pengujian",
        photos,
        fileId: photos[0].id,
        published: true,
      },
      {
        id: "DAILY-INTERNAL",
        date: "2026-10-15",
        progress: 18,
        activities: "CATATAN INTERNAL RAHASIA",
        published: false,
      },
    ];
    p.progressWeekly = [
      {
        id: "WEEKLY-PUBLIC",
        start: "2026-10-12",
        end: "2026-10-18",
        progress: 18,
        targetProgress: 20,
        activities: "Laporan mingguan pengujian",
        photos,
        fileId: photos[0].id,
        published: true,
      },
    ];
    db.prepare("INSERT INTO app_state(id,version,data) VALUES(1,1,?)").run(
      JSON.stringify(state),
    );
  }
  reset();
  const env = {
    DB: {
      prepare(sql) {
        let args = [];
        return {
          bind(...values) {
            args = values;
            return this;
          },
          async first() {
            return db.prepare(sql).get(...args) || null;
          },
          async all() {
            return { results: db.prepare(sql).all(...args) };
          },
          async run() {
            const result = db.prepare(sql).run(...args);
            return { meta: { changes: Number(result.changes) } };
          },
        };
      },
    },
    FILES: {
      async put(key, body, options) {
        files.set(key, {
          body: Buffer.from(await new Response(body).arrayBuffer()),
          ...options,
        });
      },
      async get(key) {
        const file = files.get(key);
        return file
          ? {
              body: file.body,
              writeHttpMetadata(headers) {
                headers.set("content-type", file.httpMetadata.contentType);
              },
            }
          : null;
      },
      async delete(key) {
        files.delete(key);
      },
    },
    ASSETS: {
      async fetch(request) {
        if (!staticRoot) return new Response("Test API only", { status: 404 });
        const pathname = decodeURIComponent(new URL(request.url).pathname);
        let filename = resolve(staticRoot, "." + pathname);
        if (!filename.startsWith(staticRoot + sep) && filename !== staticRoot)
          return new Response("Not found", { status: 404 });
        if (pathname === "/") filename = resolve(staticRoot, "index.html");
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "application/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".json": "application/json",
          ".svg": "image/svg+xml",
          ".png": "image/png",
        };
        try {
          return new Response(await readFile(filename), {
            headers: {
              "content-type":
                types[extname(filename)] || "application/octet-stream",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  };
  return {
    env,
    token,
    files,
    reset,
    get db() {
      return db;
    },
    close() {
      db.close();
    },
  };
}
