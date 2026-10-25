import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:43123",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:43123",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      DEMO_MODE: "true",
      DEMO_PACE_MS: "0",
      LLM_ENABLED: "false",
    },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
