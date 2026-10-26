import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "webkit",
      testMatch: "**/month-picker.e2e.ts",
      use: {
        browserName: "webkit",
        launchOptions: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE }
          : {},
      },
    },
    {
      name: "firefox",
      testMatch: "**/month-picker.e2e.ts",
      use: {
        browserName: "firefox",
        launchOptions: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE }
          : {},
      },
    },
  ],
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
        "bun run build && RMS_TEST_STORAGE=normalized RMS_TEST_STATIC_ROOT=web/build RMS_TEST_PORT=4175 node --import ./tests/helpers/register-wasm.mjs tests/mock-api.mjs",
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
