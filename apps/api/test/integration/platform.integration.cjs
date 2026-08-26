const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");

const apiDirectory = path.resolve(__dirname, "../..");
const baseUrl = "http://127.0.0.1:4011";
const prisma = new PrismaClient();
let api;
let redis;
let createdIncidentId;
let output = "";

async function main() {
  try {
    await prisma.incident.updateMany({
      where: { deletedAt: null, title: "Integration test payment investigation" },
      data: { deletedAt: new Date() }
    });

    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null
    });
    await redis.connect();
    assert.equal(await redis.ping(), "PONG", "integration Redis must accept real connections");
    await redis.flushdb();

    api = spawn(process.execPath, ["dist/main.js"], {
      cwd: apiDirectory,
      env: { ...process.env, API_PORT: "4011", APP_URL: "http://localhost:5173", NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    api.stdout.on("data", capture);
    api.stderr.on("data", capture);

    await waitForReady();
    await exercisePlatformFlow();
    await verifyOperationalEndpoints();
    console.log("PlusOps PostgreSQL HTTP integration passed.");
  } finally {
    if (createdIncidentId) {
      await prisma.incident
        .update({ where: { id: createdIncidentId }, data: { deletedAt: new Date() } })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
    await stopApi();
    if (redis) {
      await redis.flushdb().catch(() => undefined);
      await redis.quit().catch(() => redis.disconnect());
    }
  }
}

async function exercisePlatformFlow() {
  const login = await jsonRequest("/api/v1/auth/login", {
    method: "POST",
    body: { email: "manager@plusops.local", password: "PlusOpsDev123!" },
    expectedStatus: 200
  });
  const token = login.body.accessToken;
  assert.equal(typeof token, "string");

  const services = await jsonRequest("/api/v1/services?pageSize=100", { token, expectedStatus: 200 });
  assert.ok(services.body.data.length > 3);
  const payments = services.body.data.find((service) => service.slug === "payments-api");
  assert.ok(payments, "seeded Payments API service must exist");

  const health = await jsonRequest(`/api/v1/services/${payments.id}/health`, { token, expectedStatus: 200 });
  const databaseCheck = health.body.checks.find((check) => check.type === "database");
  assert.ok(databaseCheck, "Payments API must expose its seeded database check");
  const executedHealth = await jsonRequest(`/api/v1/health-checks/${databaseCheck.id}/run`, {
    method: "POST",
    token,
    body: { status: "unhealthy", message: "caller supplied fake result" },
    expectedStatus: 201
  });
  assert.equal(executedHealth.body.result.status, "healthy");
  assert.match(executedHealth.body.result.message, /PostgreSQL/);

  const metrics = await jsonRequest(`/api/v1/metrics?serviceId=${payments.id}&pageSize=100`, {
    token,
    expectedStatus: 200
  });
  assert.ok(metrics.body.data.length > 0);
  const metric = metrics.body.data[0];
  const metricResult = await jsonRequest("/api/v1/metrics/query", {
    method: "POST",
    token,
    body: {
      metricDefinitionId: metric.id,
      serviceId: payments.id,
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
      aggregation: "average",
      pageSize: 100,
      limit: 100
    },
    expectedStatus: 201
  });
  assert.equal(metricResult.body.simulated, false);
  assert.ok(metricResult.body.data.length > 0);

  const alerts = await jsonRequest("/api/v1/alerts?pageSize=100", { token, expectedStatus: 200 });
  const enabledAlert = alerts.body.data.find((alert) => alert.isEnabled);
  assert.ok(enabledAlert, "an enabled seeded alert must exist");
  const evaluatedAlert = await jsonRequest(`/api/v1/alerts/${enabledAlert.id}/evaluate`, {
    method: "POST",
    token,
    expectedStatus: 201
  });
  assert.ok(evaluatedAlert.body.evaluation);

  const incident = await jsonRequest("/api/v1/incidents", {
    method: "POST",
    token,
    body: {
      title: "Integration test payment investigation",
      description: "Created by the real PostgreSQL HTTP integration suite.",
      serviceId: payments.id,
      severity: "sev2",
      priority: "high",
      customerImpact: "Integration validation only."
    },
    expectedStatus: 201
  });
  createdIncidentId = incident.body.incident.id;

  await jsonRequest(`/api/v1/incidents/${createdIncidentId}/comments`, {
    method: "POST",
    token,
    body: { body: "Confirmed that the API, repository, and timeline path persist together." },
    expectedStatus: 201
  });
  for (const status of ["investigating", "identified", "mitigated", "monitoring"]) {
    await jsonRequest(`/api/v1/incidents/${createdIncidentId}/status`, {
      method: "POST",
      token,
      body: { status },
      expectedStatus: 201
    });
  }
  const resolved = await jsonRequest(`/api/v1/incidents/${createdIncidentId}/resolve`, {
    method: "POST",
    token,
    body: { resolutionSummary: "Integration path verified." },
    expectedStatus: 201
  });
  assert.equal(resolved.body.incident.status, "resolved");
  assert.ok(resolved.body.incident.timeline.length >= 3);

  const cookies = login.response.headers.getSetCookie?.() ?? [];
  await jsonRequest("/api/v1/auth/logout", {
    method: "POST",
    headers: cookies.length ? { cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; ") } : {},
    expectedStatus: 204
  });
}

async function verifyOperationalEndpoints() {
  const readiness = await jsonRequest("/api/v1/health/ready", { expectedStatus: 200 });
  assert.equal(readiness.body.dependencies.postgresql.status, "ok");
  assert.equal(readiness.body.dependencies.redis.status, "ok");

  const login = await jsonRequest("/api/v1/auth/login", {
    method: "POST",
    body: { email: "developer@plusops.local", password: "PlusOpsDev123!" },
    expectedStatus: 200
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const unavailableAI = await jsonRequest("/api/v1/ai/chat", {
      method: "POST",
      token: login.body.accessToken,
      body: { message: "Summarize current incidents." },
      expectedStatus: 503
    });
    assert.match(unavailableAI.body.error.message, /not configured/i);
  }

  const limitedAI = await jsonRequest("/api/v1/ai/chat", {
    method: "POST",
    token: login.body.accessToken,
    body: { message: "Summarize current incidents." },
    expectedStatus: 429
  });
  assert.match(limitedAI.body.error.message, /rate limit exceeded/i);
  assert.ok(Number(limitedAI.response.headers.get("retry-after")) > 0);

  const metrics = await textRequest("/api/internal/metrics", { expectedStatus: 200 });
  assert.match(metrics.body, /plusops_http_requests_total/);
  assert.match(metrics.body, /plusops_http_request_duration_seconds/);
  assert.match(metrics.body, /plusops_ai_rate_limit_decisions_total/);
  assert.match(metrics.body, /outcome="blocked"/);
  assert.match(metrics.body, /plusops_redis_available 1/);
}

async function jsonRequest(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  assert.equal(response.status, options.expectedStatus, `${options.method ?? "GET"} ${route} returned ${response.status}: ${text}`);
  return { response, body };
}

async function textRequest(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`);
  const body = await response.text();
  assert.equal(response.status, options.expectedStatus, `GET ${route} returned ${response.status}`);
  return { response, body };
}

async function waitForReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (api.exitCode !== null) throw new Error(`PlusOps API exited before readiness.\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/v1/health/ready`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`PlusOps API did not become ready.\n${output}`);
}

function capture(chunk) {
  output += chunk.toString();
  if (output.length > 20_000) output = output.slice(-20_000);
}

async function stopApi() {
  if (!api || api.killed || !api.pid) return;
  if (api.exitCode !== null) return;

  const closed = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("PlusOps integration API did not terminate cleanly.")),
      10_000
    );
    api.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });

  if (!api.kill("SIGTERM")) {
    throw new Error("PlusOps integration API could not be signalled for shutdown.");
  }
  await closed;
  api.stdout?.destroy();
  api.stderr?.destroy();
}

main().catch((error) => {
  console.error(error);
  if (output) console.error("\nAPI output:\n", output);
  process.exitCode = 1;
});
