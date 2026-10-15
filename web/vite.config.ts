import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
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
          target: env.RMS_API_ORIGIN || "http://127.0.0.1:8788",
          changeOrigin: true,
        },
      },
    },
  };
});
