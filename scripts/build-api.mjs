import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const result = await Bun.build({
  entrypoints: [resolve(root, "api/src/index.ts")],
  outdir: resolve(root, "api/build"),
  naming: "_worker.js",
  target: "browser",
  format: "esm",
  minify: false,
  banner:
    "// Generated from api/src/index.ts. Edit the TypeScript source, then run bun run build:api.",
});
if (!result.success)
  throw new AggregateError(result.logs, "Hono Worker build failed");
console.log("Hono API bundled: api/build/_worker.js");
