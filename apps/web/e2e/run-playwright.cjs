const { spawnSync } = require("node:child_process");
const path = require("node:path");

const webDirectory = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(webDirectory, "../..");
const apiDirectory = path.join(repositoryRoot, "apps", "api");
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required. Browser tests never use DATABASE_URL implicitly.");
  process.exit(1);
}

const environment = {
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

runPnpm(["--filter", "@plusops/contracts", "build"], repositoryRoot);
runPnpm(["run", "prisma:deploy"], apiDirectory);
runPnpm(["run", "prisma:seed"], apiDirectory);
runPnpm(["run", "build"], apiDirectory);
runPnpm(["exec", "playwright", "test", ...process.argv.slice(2)], webDirectory);

function runPnpm(args, cwd) {
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", ["pnpm", ...args].map(quoteWindowsArgument).join(" ")]
      : args;
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: environment,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function quoteWindowsArgument(value) {
  return /[\s"&|<>^]/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
