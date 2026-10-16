import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
// Test-only Node loader. Production Cloudflare imports the compiled WASM module directly.
registerHooks({
  load(url, context, next) {
    if (url.endsWith(".wasm"))
      return {
        format: "module",
        shortCircuit: true,
        source:
          "export default new WebAssembly.Module(Uint8Array.from(" +
          JSON.stringify([...readFileSync(new URL(url))]) +
          "));",
      };
    return next(url, context);
  },
});
