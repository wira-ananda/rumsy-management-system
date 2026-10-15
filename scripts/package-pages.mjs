import { copyFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "web/build");
const originalHashes = JSON.parse(
  await readFile(resolve(root, "baseline/checksums.json"), "utf8"),
);
const worker = await readFile(resolve(root, "_worker.js"));
const digest = createHash("sha256").update(worker).digest("hex");
if (digest !== originalHashes["_worker.js"])
  throw new Error("Worker changed: review separately before packaging.");
await copyFile(resolve(root, "_worker.js"), resolve(out, "_worker.js"));
// The existing per-project links remain /client.html?token=... .
await copyFile(resolve(out, "index.html"), resolve(out, "client.html"));
console.log(
  "Cloudflare Pages package: web/build (original Worker preserved byte-for-byte).",
);
