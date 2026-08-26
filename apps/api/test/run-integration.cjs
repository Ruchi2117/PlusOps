const { spawnSync } = require("node:child_process");

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required. Integration tests never use DATABASE_URL implicitly.");
  process.exit(1);
}

const environment = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  NODE_ENV: "test",
  APP_URL: "http://localhost:5173",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "integration-access-secret-at-least-24-characters",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "integration-refresh-secret-at-least-24-characters",
  REDIS_URL: process.env.TEST_REDIS_URL ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379/1",
  AI_RATE_LIMIT_MAX_REQUESTS: "2",
  AI_RATE_LIMIT_WINDOW_SECONDS: "60"
};
delete environment.AI_API_KEY;
delete environment.AI_MODEL;

for (const script of ["prisma:deploy", "prisma:seed", "build"]) {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", `pnpm run ${script}`] : ["run", script];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const integration = spawnSync(process.execPath, ["test/integration/platform.integration.cjs"], {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit"
});
if (integration.status !== 0) process.exit(integration.status ?? 1);
