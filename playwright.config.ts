import { defineConfig, devices } from "@playwright/test";

const appPort = process.env.LORECRAFT_E2E_APP_PORT ?? "3101";
const fixturePort = process.env.LORECRAFT_E2E_FIXTURE_PORT ?? "3102";
const baseURL = process.env.LORECRAFT_E2E_BASE_URL ?? `http://127.0.0.1:${appPort}`;
const fixtureURL = `http://127.0.0.1:${fixturePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
  webServer: [
    {
      name: "fixture-llm",
      command: `LORECRAFT_FIXTURE_PORT=${fixturePort} npm run e2e:fixture`,
      url: `${fixtureURL}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      name: "convex",
      command: "npm run e2e:convex",
      url: "http://127.0.0.1:3210",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      name: "lorecraft-app",
      command: `PORT=${appPort} NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 LLM_BASE_URL=${fixtureURL}/v1 LLM_API_KEY=fixture LLM_MODEL=lorecraft-fixture-model npm run e2e:next`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
