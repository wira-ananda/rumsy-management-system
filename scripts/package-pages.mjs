import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "web/build");
await copyFile(
  resolve(root, "api/build/_worker.js"),
  resolve(out, "_worker.js"),
);
// The existing per-project links remain /client.html?token=... .
await copyFile(resolve(out, "index.html"), resolve(out, "client.html"));
console.log(
  "Cloudflare Pages package: web/build (Hono Worker bundled from api/src).",
);
