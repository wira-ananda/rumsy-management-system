import { resolve } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "api/build");
await mkdir(out, { recursive: true });
const result = await Bun.build({
  entrypoints: [resolve(root, "api/src/index.ts")],
  outdir: out,
  naming: "_worker.js",
  target: "browser",
  format: "esm",
  minify: false,
  banner:
    "// Generated from api/src/index.ts. Edit the TypeScript source, then run bun run build:api.",
  plugins: [
    {
      name: "cloudflare-wasm-module",
      setup(build) {
        build.onResolve(
          { filter: /query_compiler_fast_bg\.wasm\?module$/ },
          () => ({ path: "prisma-wasm", namespace: "rms-wasm" }),
        );
        build.onLoad({ filter: /.*/, namespace: "rms-wasm" }, () => ({
          contents:
            'import module from "./query_compiler_fast_bg.wasm"; export default module;',
          loader: "js",
        }));
        build.onResolve(
          { filter: /^\.\/query_compiler_fast_bg\.wasm$/ },
          (args) => ({ path: args.path, external: true }),
        );
      },
    },
  ],
});
if (!result.success)
  throw new AggregateError(result.logs, "Hono Worker build failed");
await copyFile(
  resolve(
    root,
    "api/src/generated/prisma/internal/query_compiler_fast_bg.wasm",
  ),
  resolve(out, "query_compiler_fast_bg.wasm"),
);
console.log(
  "Hono + Prisma Worker bundled: api/build/_worker.js (with static WASM module)",
);

const codec = await Bun.build({
  entrypoints: [resolve(root, "api/src/modules/storage/record-codec.ts")],
  outdir: out,
  naming: "record-codec.mjs",
  target: "node",
  format: "esm",
});
if (!codec.success) throw new AggregateError(codec.logs, "Codec build failed");
