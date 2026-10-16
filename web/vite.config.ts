import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.RMS_API_ORIGIN || "http://127.0.0.1:8788";
  return {
    plugins: [
      sveltekit({
        adapter: adapter({
          pages: "build",
          assets: "build",
          fallback: "index.html",
        }),
        compilerOptions: { runes: true },
      }),
    ],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          configure(proxy) {
            proxy.on("proxyReq", (proxyRequest, request) => {
              const origin = request.headers.origin;
              // Translate only a same-origin browser request through this local
              // proxy. Foreign Origins remain foreign and are rejected by API.
              try {
                if (origin && new URL(origin).host === request.headers.host)
                  proxyRequest.setHeader("origin", new URL(target).origin);
              } catch {
                /* Invalid/opaque Origins remain unchanged for API rejection. */
              }
            });
          },
        },
      },
    },
  };
});
