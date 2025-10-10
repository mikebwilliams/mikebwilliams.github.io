import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 3000,
  outputDir: "test-results",
  use: {
    browserName: "firefox",
    //baseURL: "http://localhost:8000", // uncomment if you want page.goto("/") style
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  // If you *want* Playwright to start a server for you, uncomment:
  // webServer: { command: "python3 -m http.server 8000", url: "http://localhost:8000", reuseExistingServer: true },
});
