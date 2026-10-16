import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:4175",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: [
    {
      command:
        "bun run build && RMS_TEST_STATIC_ROOT=web/build RMS_TEST_PORT=4175 node tests/mock-api.mjs",
      url: "http://127.0.0.1:4175/api/health",
      reuseExistingServer: false,
    },
    {
      command:
        "RMS_API_ORIGIN=http://127.0.0.1:4175 bun run --cwd web dev --port 4176 --strictPort",
      url: "http://127.0.0.1:4176",
      reuseExistingServer: false,
    },
  ],
});
