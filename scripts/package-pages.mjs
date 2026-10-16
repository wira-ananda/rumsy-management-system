import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  out = resolve(root, "web/build");
// Pages advanced mode uses a module directory for Prisma's statically imported WASM.
await rm(resolve(out, "_worker.js"), { recursive: true, force: true });
await mkdir(resolve(out, "_worker.js"), { recursive: true });
await copyFile(
  resolve(root, "api/build/_worker.js"),
  resolve(out, "_worker.js/index.js"),
);
await copyFile(
  resolve(root, "api/build/query_compiler_fast_bg.wasm"),
  resolve(out, "_worker.js/query_compiler_fast_bg.wasm"),
);
await copyFile(resolve(out, "index.html"), resolve(out, "client.html"));
console.log(
  "Cloudflare Pages package: web/build (Hono + Prisma module Worker).",
);
