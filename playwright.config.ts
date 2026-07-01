import { defineConfig, devices } from "@playwright/test";

const appPort = parsePort(process.env.LORECRAFT_E2E_APP_PORT, 3101, "LORECRAFT_E2E_APP_PORT");
const fixturePort = parsePort(
  process.env.LORECRAFT_E2E_FIXTURE_PORT,
  3102,
  "LORECRAFT_E2E_FIXTURE_PORT",
);
const baseURL = process.env.LORECRAFT_E2E_BASE_URL ?? `http://127.0.0.1:${appPort}`;
assertLoopbackBaseURL(baseURL);
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
      reuseExistingServer: false,
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

function parsePort(value: string | undefined, fallback: number, name: string) {
  if (value === undefined) {
    return String(fallback);
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535 || String(port) !== value) {
    throw new Error(`${name} must be an integer port from 1 to 65535.`);
  }

  return String(port);
}

function assertLoopbackBaseURL(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("LORECRAFT_E2E_BASE_URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("LORECRAFT_E2E_BASE_URL must use http or https.");
  }

  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("LORECRAFT_E2E_BASE_URL must point to localhost or loopback.");
  }
}
