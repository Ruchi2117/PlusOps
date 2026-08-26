import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(webDirectory, "../..");
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required. Browser tests never use DATABASE_URL implicitly.");
}

const sharedEnvironment = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  NODE_ENV: "test",
  APP_URL: "http://127.0.0.1:5180",
  API_PORT: "4020",
  JWT_ACCESS_SECRET: "e2e-access-secret-at-least-24-characters",
  JWT_REFRESH_SECRET: "e2e-refresh-secret-at-least-24-characters",
  AI_PROVIDER: "openai",
  AI_API_KEY: "e2e-provider-key",
  AI_MODEL: "e2e-grounded-model",
  AI_BASE_URL: "http://127.0.0.1:4010/v1",
  REDIS_URL: process.env.TEST_REDIS_URL ?? "redis://127.0.0.1:6379/2",
  AI_RATE_LIMIT_MAX_REQUESTS: "50"
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:5180",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "node apps/web/e2e/fake-ai-server.cjs",
      cwd: repositoryRoot,
      url: "http://127.0.0.1:4010/health",
      reuseExistingServer: false
    },
    {
      command: "node apps/api/dist/main.js",
      cwd: repositoryRoot,
      env: sharedEnvironment,
      url: "http://127.0.0.1:4020/api/v1/health",
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5180",
      cwd: webDirectory,
      env: {
        ...process.env,
        VITE_API_URL: "http://127.0.0.1:4020",
        VITE_PLUSOPS_DATA_MODE: "live"
      },
      url: "http://127.0.0.1:5180/login",
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
