import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { PermissionKey, UserRole } from "@plusops/contracts";

import { ROLE_PERMISSION_MATRIX } from "../src/modules/auth/authorization/permission-catalog";

loadEnv(resolve(__dirname, "../../../.env"));
loadEnv(resolve(__dirname, "../.env"));

const prisma = new PrismaClient();

const seedSource = "plusops-seed";
const localPassword = "PlusOpsDev123!";
const passwordHash =
  "$argon2id$v=19$m=19456,p=1,t=2$cGx1c29wcy1kZW1vLXNlZWQ$ypD9FkfWrlFntL8xjA22KjgaMcN0WAJSXRsgU1S8U1o";

const now = new Date();

const roleMetadata = {
  admin: {
    name: "Admin",
    description: "Full platform administration access."
  },
  engineering_manager: {
    name: "Engineering Manager",
    description: "Team ownership, incident escalation, and operational reports."
  },
  developer: {
    name: "Developer",
    description: "Service ownership and incident response access."
  },
  qa_engineer: {
    name: "QA Engineer",
    description: "API testing, report visibility, and incident collaboration."
  },
  viewer: {
    name: "Viewer",
    description: "Read-only operational visibility."
  }
} satisfies Record<UserRole, { name: string; description: string }>;

const users = [
  user("admin", "admin@plusops.local", "Ruchi Shaktawat", "admin"),
  user("manager", "manager@plusops.local", "Maya Rao", "engineering_manager"),
  user("developer", "developer@plusops.local", "Arjun Mehta", "developer"),
  user("qa", "qa@plusops.local", "Neha Kapoor", "qa_engineer"),
  user("viewer", "viewer@plusops.local", "Liam Chen", "viewer")
] as const;

const teams = [
  team("platform", "Platform Engineering"),
  team("payments", "Payments Platform"),
  team("core-services", "Core Services"),
  team("developer-experience", "Developer Experience")
] as const;

const environments = [
  environment("production", "Production", "PRODUCTION", "Customer-facing production environment."),
  environment("staging", "Staging", "STAGING", "Pre-production release validation."),
  environment("development", "Development", "DEVELOPMENT", "Local and integration development.")
] as const;

const services = [
  service("api-gateway", "API Gateway", "platform", 1, "Edge routing for customer and internal APIs."),
  service("checkout", "Checkout", "payments", 1, "Customer checkout workflow and payment orchestration."),
  service("payments-api", "Payments API", "payments", 1, "Payment authorization and capture API."),
  service("payments-database", "Payments Database", "payments", 1, "Primary PostgreSQL store for payment transactions."),
  service("auth-service", "Auth Service", "platform", 1, "Identity, session, and RBAC service."),
  service("notifications", "Notifications", "core-services", 2, "Email and webhook notification delivery."),
  service("search-indexer", "Search Indexer", "core-services", 2, "Search indexing workers for operational data."),
  service("developer-portal", "Developer Portal", "developer-experience", 2, "Internal developer portal frontend.")
] as const;

const dependencies = [
  dependency("api-gateway", "checkout", "Routes checkout traffic to the orchestration service."),
  dependency("checkout", "payments-api", "Checkout calls Payments API during authorization."),
  dependency("payments-api", "payments-database", "Payments API persists transactions in the primary database."),
  dependency("checkout", "auth-service", "Checkout validates session and RBAC context."),
  dependency("api-gateway", "auth-service", "Gateway validates access tokens before forwarding requests."),
  dependency("notifications", "checkout", "Notifications consumes checkout completion events."),
  dependency("developer-portal", "api-gateway", "Frontend calls the API Gateway for platform data."),
  dependency("search-indexer", "payments-api", "Indexer reads payment events for operational search.")
] as const;

const deployments = [
  deployment("payments-api", "production", "2026.08.12.4", "9f2a7bc", "SUCCEEDED", 185, 181),
  deployment("checkout", "production", "2026.08.12.7", "2c91fe4", "SUCCEEDED", 130, 124),
  deployment("api-gateway", "production", "2026.08.12.2", "ac42b81", "SUCCEEDED", 280, 277),
  deployment("notifications", "production", "2026.08.12.1", "44c91ad", "SUCCEEDED", 1_030, 1_025),
  deployment("developer-portal", "staging", "2026.08.13.1", "71fa3aa", "PENDING", 18, null)
] as const;

const healthChecks = [
  healthCheck("api-gateway", "edge-readiness", "Edge readiness", "HTTP_ENDPOINT", "/ready", true, "HEALTHY", 77),
  healthCheck("checkout", "checkout-http", "Checkout HTTP", "HTTP_ENDPOINT", "/health", true, "DEGRADED", 680),
  healthCheck("checkout", "payments-api-dependency", "Payments API dependency", "DEPENDENCY", "payments-api", true, "DEGRADED", 740),
  healthCheck("payments-api", "payments-readiness", "Payments readiness", "HTTP_ENDPOINT", "/ready", true, "DEGRADED", 620),
  healthCheck("payments-api", "payments-database", "Payments database connectivity", "DATABASE", "payments-database", true, "HEALTHY", 38),
  healthCheck("payments-api", "processor-synthetic", "Processor synthetic authorization", "SYNTHETIC", "processor-auth", false, "UNHEALTHY", 1_220),
  healthCheck("payments-database", "postgres-connectivity", "PostgreSQL connectivity", "DATABASE", "postgresql://payments", true, "HEALTHY", 24),
  healthCheck("auth-service", "auth-live", "Auth live", "HTTP_ENDPOINT", "/live", true, "HEALTHY", 44),
  healthCheck("notifications", "webhook-queue", "Webhook queue depth", "DEPENDENCY", "webhook-worker", false, "DEGRADED", 515),
  healthCheck("search-indexer", "redis-cache", "Redis cache", "CACHE", "redis://cache", false, "HEALTHY", 12),
  healthCheck("developer-portal", "frontend-synthetic", "Frontend synthetic path", "SYNTHETIC", "/dashboard", true, "HEALTHY", 146)
] as const;

const healthEvaluations = [
  evaluation("api-gateway", "HEALTHY", "All edge checks are passing.", 8),
  evaluation("checkout", "DEGRADED", "Checkout remains available, but Payments API dependency latency is elevated.", 5),
  evaluation("payments-api", "DEGRADED", "One optional synthetic processor check is failing while database connectivity remains healthy.", 4),
  evaluation("payments-database", "HEALTHY", "Database connectivity is healthy.", 4),
  evaluation("auth-service", "HEALTHY", "Authentication endpoints are healthy.", 8),
  evaluation("notifications", "DEGRADED", "Optional webhook queue is behind expected processing latency.", 12),
  evaluation("search-indexer", "HEALTHY", "Indexing and cache checks are healthy.", 20),
  evaluation("developer-portal", "HEALTHY", "Frontend synthetic checks are passing.", 15)
] as const;

const incidents = [
  incident(
    "checkout-latency",
    "Checkout latency above SLO",
    "Customers are seeing slower checkout confirmation after a payment processor latency spike.",
    "SEV1",
    "URGENT",
    "IDENTIFIED",
    "checkout",
    "manager",
    "developer",
    "Checkout confirmation latency is above the 500ms SLO for production customers.",
    54,
    null,
    null,
    ["payments", "latency", "customer-impact"]
  ),
  incident(
    "notifications-delay",
    "Webhook delivery backlog",
    "Notification workers are processing webhook retries more slowly than normal.",
    "SEV2",
    "HIGH",
    "INVESTIGATING",
    "notifications",
    "developer",
    "qa",
    "Merchant webhook delivery is delayed, but checkout remains available.",
    118,
    null,
    null,
    ["webhooks", "queue", "degraded"]
  ),
  incident(
    "search-index-lag",
    "Search indexing lag recovered",
    "Search indexing lagged after a worker deploy and recovered after scaling workers.",
    "SEV3",
    "MEDIUM",
    "RESOLVED",
    "search-indexer",
    "qa",
    "developer",
    "Internal search results were delayed for newly created services.",
    1_620,
    1_300,
    null,
    ["search", "resolved"]
  ),
  incident(
    "auth-cache-miss",
    "Auth cache miss spike closed",
    "An auth cache configuration issue caused elevated database reads and was closed after rollback.",
    "SEV3",
    "MEDIUM",
    "CLOSED",
    "auth-service",
    "manager",
    "developer",
    "No customer-facing authentication failures were observed.",
    3_600,
    3_420,
    3_240,
    ["auth", "rollback", "closed"]
  )
] as const;

const incidentComments = [
  comment(
    "checkout-latency",
    "manager-triage",
    "manager",
    "Seeing p95 checkout latency above 700ms since the last Payments API deploy. @arjun please compare processor auth latency and DB timing.",
    48,
    ["developer"]
  ),
  comment(
    "checkout-latency",
    "developer-update",
    "developer",
    "Processor synthetic checks are failing, but database connectivity is healthy. I am keeping traffic on the current release and watching the error rate.",
    32,
    []
  ),
  comment(
    "checkout-latency",
    "qa-impact",
    "qa",
    "QA reproduced slower confirmation on production-like checkout, no duplicate charge evidence yet.",
    18,
    []
  ),
  comment(
    "notifications-delay",
    "qa-retry",
    "qa",
    "Webhook retries are draining slowly. No data loss observed, but merchants may see delayed callbacks.",
    82,
    []
  ),
  comment(
    "search-index-lag",
    "resolved-note",
    "developer",
    "Workers scaled from 3 to 6 and queue lag returned to baseline.",
    1_310,
    []
  )
] as const;

const metricDefinitions = [
  metricDefinition("api-gateway", "api_latency_ms", "API latency", "HISTOGRAM", "MILLISECONDS", "AVERAGE"),
  metricDefinition("checkout", "api_latency_ms", "Checkout API latency", "HISTOGRAM", "MILLISECONDS", "AVERAGE"),
  metricDefinition("payments-api", "api_latency_ms", "Payments API latency", "HISTOGRAM", "MILLISECONDS", "AVERAGE"),
  metricDefinition("payments-api", "error_rate", "Payments error rate", "GAUGE", "PERCENT", "AVERAGE"),
  metricDefinition("payments-api", "request_rate", "Payments request rate", "COUNTER", "REQUESTS", "RATE"),
  metricDefinition("payments-database", "db_connections", "Database connections", "GAUGE", "COUNT", "MAXIMUM"),
  metricDefinition("notifications", "queue_depth", "Webhook queue depth", "GAUGE", "COUNT", "MAXIMUM"),
  metricDefinition("auth-service", "availability", "Auth availability", "GAUGE", "PERCENT", "MINIMUM"),
  metricDefinition("checkout", "checkout_success_rate", "Checkout success rate", "GAUGE", "PERCENT", "MINIMUM")
] as const;

const metricSeries = [
  series("api-gateway", "api_latency_ms", labels("api-gateway", "production", { route: "edge", region: "us-east-1" })),
  series("checkout", "api_latency_ms", labels("checkout", "production", { route: "checkout", region: "us-east-1" })),
  series("payments-api", "api_latency_ms", labels("payments-api", "production", { route: "authorize", region: "us-east-1" })),
  series("payments-api", "error_rate", labels("payments-api", "production", { route: "authorize", region: "us-east-1" })),
  series("payments-api", "request_rate", labels("payments-api", "production", { route: "authorize", region: "us-east-1" })),
  series("payments-database", "db_connections", labels("payments-database", "production", { pool: "primary" })),
  series("notifications", "queue_depth", labels("notifications", "production", { queue: "webhooks" })),
  series("auth-service", "availability", labels("auth-service", "production", { region: "us-east-1" })),
  series("checkout", "checkout_success_rate", labels("checkout", "production", { route: "checkout" }))
] as const;

const metricSamples = [
  samples("api-gateway", "api_latency_ms", [88, 92, 96, 110, 118, 120, 112, 105, 101, 96, 91, 90]),
  samples("checkout", "api_latency_ms", [210, 240, 310, 420, 560, 720, 760, 690, 610, 540, 480, 430]),
  samples("payments-api", "api_latency_ms", [180, 210, 260, 340, 520, 680, 740, 650, 560, 480, 420, 360]),
  samples("payments-api", "error_rate", [0.7, 0.9, 1.3, 2.1, 4.9, 7.2, 6.7, 5.8, 4.6, 3.2, 2.1, 1.4]),
  samples("payments-api", "request_rate", [1_250, 1_420, 1_580, 1_740, 1_960, 2_130, 2_270, 2_390, 2_460, 2_510, 2_560, 2_610]),
  samples("payments-database", "db_connections", [36, 39, 42, 47, 51, 58, 62, 59, 54, 48, 43, 40]),
  samples("notifications", "queue_depth", [80, 94, 121, 177, 260, 344, 421, 388, 310, 251, 190, 143]),
  samples("auth-service", "availability", [100, 100, 99.99, 100, 100, 100, 99.99, 100, 100, 100, 100, 100]),
  samples("checkout", "checkout_success_rate", [99.8, 99.7, 99.4, 98.9, 97.8, 96.2, 96.8, 97.4, 98.1, 98.7, 99.1, 99.4])
] as const;

const alertRules = [
  alertRule(
    "payments-api-latency",
    "Payments API p95 latency > 500ms",
    "Fires when production Payments API latency exceeds the checkout SLO.",
    "CRITICAL",
    "FIRING",
    "payments-api",
    "api_latency_ms",
    "PERCENTILE",
    95,
    "GREATER_THAN",
    500,
    null,
    null
  ),
  alertRule(
    "payments-api-error-rate",
    "Payments API error rate > 5%",
    "Tracks authorization error rate during payment processor degradation.",
    "WARNING",
    "PENDING",
    "payments-api",
    "error_rate",
    "AVERAGE",
    null,
    "GREATER_THAN",
    5,
    null,
    null
  ),
  alertRule(
    "notifications-queue-depth",
    "Webhook queue depth > 300",
    "Detects delayed merchant webhook delivery.",
    "WARNING",
    "FIRING",
    "notifications",
    "queue_depth",
    "MAXIMUM",
    null,
    "GREATER_THAN",
    300,
    null,
    null
  ),
  alertRule(
    "auth-availability",
    "Auth availability below 99.9%",
    "Protects the authentication path used by every product surface.",
    "CRITICAL",
    "OK",
    "auth-service",
    "availability",
    "MINIMUM",
    null,
    "LESS_THAN",
    99.9,
    null,
    null
  )
] as const;

const providers = [
  provider("OPENAI", "OpenAI", "gpt-simulated-plusops", 10, 0.005, 0.015),
  provider("CLAUDE", "Claude", "claude-simulated-plusops", 20, 0.003, 0.015),
  provider("GEMINI", "Gemini", "gemini-simulated-plusops", 30, 0.001, 0.004),
  provider("GROQ", "Groq", "groq-simulated-plusops", 40, 0.001, 0.002)
] as const;

const promptTemplates = [
  promptTemplate("ai.chat.default", "CHAT", "PlusOps Chat", "You are PlusOps Copilot.", "{{input}}", [
    variable("input")
  ]),
  promptTemplate(
    "ai.log_analysis.default",
    "LOG_ANALYSIS",
    "Log Analysis",
    "You analyze application logs for operational risk.",
    "Analyze these logs, identify likely causes, severity, and next checks:\n\n{{input}}",
    [variable("input")]
  ),
  promptTemplate(
    "ai.stacktrace.default",
    "STACKTRACE_EXPLANATION",
    "Stack Trace Explanation",
    "You explain stack traces for backend engineers.",
    "Explain the root cause, failing frame, and likely fix for this stack trace:\n\n{{input}}",
    [variable("input")]
  ),
  promptTemplate(
    "ai.incident_summary.default",
    "INCIDENT_SUMMARIZATION",
    "Incident Summary",
    "You summarize incidents clearly for engineering teams.",
    "Summarize this incident timeline, impact, owner, status, and follow-up actions:\n\n{{input}}",
    [variable("input")]
  ),
  promptTemplate(
    "ai.sql.default",
    "SQL_GENERATION",
    "SQL Generation",
    "You generate safe SQL drafts for engineers.",
    "Generate {{dialect}} SQL for this request. Return comments explaining assumptions.\n\nSchema:\n{{schemaHint}}\n\nRequest:\n{{input}}",
    [
      variable("input"),
      variable("dialect", "postgresql"),
      variable("schemaHint", "No schema hint supplied.", false)
    ]
  ),
  promptTemplate(
    "ai.docs.default",
    "API_DOCUMENTATION",
    "API Documentation",
    "You write concise API documentation for internal engineering APIs.",
    "Create {{format}} documentation for {{apiName}} using this input:\n\n{{input}}",
    [variable("input"), variable("format", "markdown"), variable("apiName", "API", false)]
  ),
  promptTemplate(
    "ai.release_notes.default",
    "RELEASE_NOTES",
    "Release Notes",
    "You write release notes for production engineering milestones.",
    "Write release notes for version {{version}} from these changes:\n\n{{changes}}",
    [variable("version"), variable("changes")]
  ),
  promptTemplate(
    "ai.playground.default",
    "PLAYGROUND",
    "AI Playground",
    "{{systemPrompt}}",
    "{{userPrompt}}",
    [variable("systemPrompt"), variable("userPrompt")]
  )
] as const;

async function main(): Promise<void> {
  ensureDatabaseUrl();

  console.log("Seeding PlusOps deterministic demo data...");

  await seedRbacCatalog();
  await seedUsersAndTeams();
  await seedServiceCatalog();
  await seedHealth();
  await seedMetrics();
  await seedAlerts();
  await seedIncidents();
  await seedAI();
  await seedAuditLogs();

  const counts = await collectCounts();

  console.log("PlusOps seed complete.");
  console.log(`Demo password: ${localPassword}`);
  console.table(counts);
}

async function seedRbacCatalog(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const permissionKeys = Array.from(new Set(Object.values(ROLE_PERMISSION_MATRIX).flat()));

    for (const permissionKey of permissionKeys) {
      await transaction.permission.upsert({
        where: { key: permissionKey },
        update: { description: describePermission(permissionKey) },
        create: {
          id: id(`permission:${permissionKey}`),
          key: permissionKey,
          description: describePermission(permissionKey)
        }
      });
    }

    for (const [roleKey, metadata] of Object.entries(roleMetadata)) {
      const role = await transaction.role.upsert({
        where: { key: roleKey },
        update: {
          name: metadata.name,
          description: metadata.description,
          isSystem: true
        },
        create: {
          id: id(`role:${roleKey}`),
          key: roleKey,
          name: metadata.name,
          description: metadata.description,
          isSystem: true
        }
      });

      const permissions = await transaction.permission.findMany({
        where: {
          key: {
            in: [...ROLE_PERMISSION_MATRIX[roleKey as UserRole]]
          }
        },
        select: { id: true }
      });

      await transaction.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id
        })),
        skipDuplicates: true
      });
    }
  });
}

async function seedUsersAndTeams(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const seedUser of users) {
      await transaction.user.upsert({
        where: { email: seedUser.email },
        update: {
          name: seedUser.name,
          passwordHash,
          isActive: true,
          emailVerifiedAt: minutesAgo(6_000),
          deletedAt: null
        },
        create: {
          id: userId(seedUser.key),
          email: seedUser.email,
          name: seedUser.name,
          passwordHash,
          isActive: true,
          emailVerifiedAt: minutesAgo(6_000),
          createdAt: minutesAgo(6_000)
        }
      });

      const role = await transaction.role.findUniqueOrThrow({
        where: { key: seedUser.role }
      });

      await transaction.userRole.upsert({
        where: {
          userId_roleId: {
            userId: userId(seedUser.key),
            roleId: role.id
          }
        },
        update: {
          assignedByUserId: userId("admin")
        },
        create: {
          id: id(`user-role:${seedUser.key}:${seedUser.role}`),
          userId: userId(seedUser.key),
          roleId: role.id,
          assignedByUserId: seedUser.key === "admin" ? null : userId("admin"),
          assignedAt: minutesAgo(5_990)
        }
      });
    }

    for (const seedTeam of teams) {
      await transaction.team.upsert({
        where: { slug: seedTeam.slug },
        update: {
          name: seedTeam.name,
          deletedAt: null
        },
        create: {
          id: teamId(seedTeam.slug),
          name: seedTeam.name,
          slug: seedTeam.slug,
          createdAt: minutesAgo(5_700)
        }
      });
    }

    const memberships: Array<[string, string]> = [
      ["platform", "admin"],
      ["platform", "manager"],
      ["platform", "developer"],
      ["payments", "manager"],
      ["payments", "developer"],
      ["payments", "qa"],
      ["core-services", "admin"],
      ["core-services", "developer"],
      ["core-services", "viewer"],
      ["developer-experience", "admin"],
      ["developer-experience", "developer"],
      ["developer-experience", "qa"]
    ];

    for (const [teamSlug, memberKey] of memberships) {
      await transaction.teamMember.upsert({
        where: {
          teamId_userId: {
            teamId: teamId(teamSlug),
            userId: userId(memberKey)
          }
        },
        update: {},
        create: {
          id: id(`team-member:${teamSlug}:${memberKey}`),
          teamId: teamId(teamSlug),
          userId: userId(memberKey),
          createdAt: minutesAgo(5_680)
        }
      });
    }
  });
}

async function seedServiceCatalog(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const seedEnvironment of environments) {
      await transaction.environment.upsert({
        where: { slug: seedEnvironment.slug },
        update: {
          name: seedEnvironment.name,
          type: seedEnvironment.type,
          description: seedEnvironment.description,
          deletedAt: null
        },
        create: {
          id: environmentId(seedEnvironment.slug),
          name: seedEnvironment.name,
          slug: seedEnvironment.slug,
          type: seedEnvironment.type,
          description: seedEnvironment.description,
          createdAt: minutesAgo(5_400)
        }
      });
    }

    for (const seedService of services) {
      await transaction.service.upsert({
        where: { slug: seedService.slug },
        update: {
          name: seedService.name,
          description: seedService.description,
          ownerTeamId: teamId(seedService.ownerTeamSlug),
          repositoryUrl: `https://github.com/Ruchi2117/PlusOps/tree/main/apps/${seedService.slug}`,
          apiBaseUrl: `https://${seedService.slug}.plusops.local`,
          documentationUrl: `https://docs.plusops.local/services/${seedService.slug}`,
          runbookUrl: `https://runbooks.plusops.local/${seedService.slug}`,
          lifecycleStatus: "ACTIVE",
          visibility: "INTERNAL",
          tier: seedService.tier,
          deletedAt: null
        },
        create: {
          id: serviceId(seedService.slug),
          name: seedService.name,
          slug: seedService.slug,
          description: seedService.description,
          ownerTeamId: teamId(seedService.ownerTeamSlug),
          repositoryUrl: `https://github.com/Ruchi2117/PlusOps/tree/main/apps/${seedService.slug}`,
          apiBaseUrl: `https://${seedService.slug}.plusops.local`,
          documentationUrl: `https://docs.plusops.local/services/${seedService.slug}`,
          runbookUrl: `https://runbooks.plusops.local/${seedService.slug}`,
          lifecycleStatus: "ACTIVE",
          visibility: "INTERNAL",
          tier: seedService.tier,
          createdAt: minutesAgo(5_200)
        }
      });

      for (const seedEnvironment of environments) {
        await transaction.serviceEnvironment.upsert({
          where: {
            serviceId_environmentId: {
              serviceId: serviceId(seedService.slug),
              environmentId: environmentId(seedEnvironment.slug)
            }
          },
          update: {
            baseUrl: `https://${seedService.slug}.${seedEnvironment.slug}.plusops.local`,
            deletedAt: null
          },
          create: {
            id: id(`service-environment:${seedService.slug}:${seedEnvironment.slug}`),
            serviceId: serviceId(seedService.slug),
            environmentId: environmentId(seedEnvironment.slug),
            baseUrl: `https://${seedService.slug}.${seedEnvironment.slug}.plusops.local`,
            createdAt: minutesAgo(5_100)
          }
        });
      }
    }

    for (const seedDependency of dependencies) {
      await transaction.serviceDependency.upsert({
        where: {
          upstreamServiceId_downstreamServiceId: {
            upstreamServiceId: serviceId(seedDependency.upstreamServiceSlug),
            downstreamServiceId: serviceId(seedDependency.downstreamServiceSlug)
          }
        },
        update: {
          description: seedDependency.description,
          createdByUserId: userId("developer"),
          deletedAt: null
        },
        create: {
          id: id(
            `dependency:${seedDependency.upstreamServiceSlug}:${seedDependency.downstreamServiceSlug}`
          ),
          upstreamServiceId: serviceId(seedDependency.upstreamServiceSlug),
          downstreamServiceId: serviceId(seedDependency.downstreamServiceSlug),
          description: seedDependency.description,
          createdByUserId: userId("developer"),
          createdAt: minutesAgo(4_800)
        }
      });
    }

    for (const seedDeployment of deployments) {
      await transaction.deployment.upsert({
        where: { id: id(`deployment:${seedDeployment.serviceSlug}:${seedDeployment.version}`) },
        update: {
          serviceId: serviceId(seedDeployment.serviceSlug),
          environmentId: environmentId(seedDeployment.environmentSlug),
          version: seedDeployment.version,
          commitSha: seedDeployment.commitSha,
          repositoryUrl: `https://github.com/Ruchi2117/PlusOps/commit/${seedDeployment.commitSha}`,
          status: seedDeployment.status,
          deployedByUserId: userId("developer"),
          startedAt: minutesAgo(seedDeployment.startedMinutesAgo),
          finishedAt:
            seedDeployment.finishedMinutesAgo === null
              ? null
              : minutesAgo(seedDeployment.finishedMinutesAgo)
        },
        create: {
          id: id(`deployment:${seedDeployment.serviceSlug}:${seedDeployment.version}`),
          serviceId: serviceId(seedDeployment.serviceSlug),
          environmentId: environmentId(seedDeployment.environmentSlug),
          version: seedDeployment.version,
          commitSha: seedDeployment.commitSha,
          repositoryUrl: `https://github.com/Ruchi2117/PlusOps/commit/${seedDeployment.commitSha}`,
          status: seedDeployment.status,
          deployedByUserId: userId("developer"),
          startedAt: minutesAgo(seedDeployment.startedMinutesAgo),
          finishedAt:
            seedDeployment.finishedMinutesAgo === null
              ? null
              : minutesAgo(seedDeployment.finishedMinutesAgo),
          createdAt: minutesAgo(seedDeployment.startedMinutesAgo)
        }
      });
    }
  });
}

async function seedHealth(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const check of healthChecks) {
      await transaction.healthCheck.upsert({
        where: { id: healthCheckId(check.serviceSlug, check.key) },
        update: {
          serviceId: serviceId(check.serviceSlug),
          name: check.name,
          type: check.type,
          target: check.target,
          description: `${check.name} for ${check.serviceSlug}.`,
          isCritical: check.isCritical,
          isEnabled: true,
          intervalSeconds: 60,
          timeoutMs: 5_000,
          staleAfterSeconds: 3_600,
          configuration: {
            seeded: true,
            source: seedSource
          },
          deletedAt: null
        },
        create: {
          id: healthCheckId(check.serviceSlug, check.key),
          serviceId: serviceId(check.serviceSlug),
          name: check.name,
          type: check.type,
          target: check.target,
          description: `${check.name} for ${check.serviceSlug}.`,
          isCritical: check.isCritical,
          isEnabled: true,
          intervalSeconds: 60,
          timeoutMs: 5_000,
          staleAfterSeconds: 3_600,
          configuration: {
            seeded: true,
            source: seedSource
          },
          createdAt: minutesAgo(4_600)
        }
      });

      await transaction.healthCheckResult.upsert({
        where: { id: id(`health-result:${check.serviceSlug}:${check.key}:latest`) },
        update: {
          serviceId: serviceId(check.serviceSlug),
          healthCheckId: healthCheckId(check.serviceSlug, check.key),
          status: check.status,
          responseTimeMs: check.responseTimeMs,
          message: healthResultMessage(check.status, check.name),
          checkedAt: minutesAgo(3)
        },
        create: {
          id: id(`health-result:${check.serviceSlug}:${check.key}:latest`),
          serviceId: serviceId(check.serviceSlug),
          healthCheckId: healthCheckId(check.serviceSlug, check.key),
          status: check.status,
          responseTimeMs: check.responseTimeMs,
          message: healthResultMessage(check.status, check.name),
          checkedAt: minutesAgo(3),
          createdAt: minutesAgo(3)
        }
      });
    }

    for (const entry of healthEvaluations) {
      for (const age of [90, 45, entry.minutesAgo]) {
        const status = age === entry.minutesAgo ? entry.status : previousHealthStatus(entry.status);
        await transaction.serviceHealthEvaluation.upsert({
          where: { id: id(`health-evaluation:${entry.serviceSlug}:${age}`) },
          update: {
            serviceId: serviceId(entry.serviceSlug),
            status,
            summary: age === entry.minutesAgo ? entry.summary : historicalHealthSummary(status),
            evaluatedAt: minutesAgo(age)
          },
          create: {
            id: id(`health-evaluation:${entry.serviceSlug}:${age}`),
            serviceId: serviceId(entry.serviceSlug),
            status,
            summary: age === entry.minutesAgo ? entry.summary : historicalHealthSummary(status),
            evaluatedAt: minutesAgo(age),
            createdAt: minutesAgo(age)
          }
        });
      }
    }

    await transaction.serviceHealthTimelineEvent.upsert({
      where: { id: id("health-timeline:payments-api:degraded") },
      update: {
        serviceId: serviceId("payments-api"),
        healthCheckId: healthCheckId("payments-api", "processor-synthetic"),
        actorUserId: userId("developer"),
        type: "service_health_degraded",
        message: "Payments API became degraded after synthetic processor checks failed.",
        fromStatus: "HEALTHY",
        toStatus: "DEGRADED",
        metadata: { source: seedSource, relatedIncident: incidentId("checkout-latency") },
        createdAt: minutesAgo(42)
      },
      create: {
        id: id("health-timeline:payments-api:degraded"),
        serviceId: serviceId("payments-api"),
        healthCheckId: healthCheckId("payments-api", "processor-synthetic"),
        actorUserId: userId("developer"),
        type: "service_health_degraded",
        message: "Payments API became degraded after synthetic processor checks failed.",
        fromStatus: "HEALTHY",
        toStatus: "DEGRADED",
        metadata: { source: seedSource, relatedIncident: incidentId("checkout-latency") },
        createdAt: minutesAgo(42)
      }
    });
  });
}

async function seedMetrics(): Promise<void> {
  const retentionPolicyId = id("metric-retention:demo-30d");

  await prisma.$transaction(async (transaction) => {
    await transaction.metricRetentionPolicy.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });

    await transaction.metricRetentionPolicy.upsert({
      where: { name: "plusops-demo-30d" },
      update: {
        retentionDays: 30,
        resolutionSeconds: 60,
        isDefault: true
      },
      create: {
        id: retentionPolicyId,
        name: "plusops-demo-30d",
        retentionDays: 30,
        resolutionSeconds: 60,
        isDefault: true,
        createdAt: minutesAgo(4_000)
      }
    });

    for (const definition of metricDefinitions) {
      await transaction.metricDefinition.upsert({
        where: {
          serviceId_name: {
            serviceId: serviceId(definition.serviceSlug),
            name: definition.name
          }
        },
        update: {
          displayName: definition.displayName,
          description: `${definition.displayName} sampled from deterministic PlusOps demo telemetry.`,
          type: definition.type,
          unit: definition.unit,
          customUnit: null,
          defaultAggregation: definition.defaultAggregation,
          retentionPolicyId,
          isEnabled: true,
          deletedAt: null
        },
        create: {
          id: metricDefinitionId(definition.serviceSlug, definition.name),
          serviceId: serviceId(definition.serviceSlug),
          name: definition.name,
          displayName: definition.displayName,
          description: `${definition.displayName} sampled from deterministic PlusOps demo telemetry.`,
          type: definition.type,
          unit: definition.unit,
          customUnit: null,
          defaultAggregation: definition.defaultAggregation,
          retentionPolicyId,
          isEnabled: true,
          createdAt: minutesAgo(3_900)
        }
      });

      await transaction.serviceMetricTimelineEvent.upsert({
        where: { id: id(`metric-timeline:${definition.serviceSlug}:${definition.name}`) },
        update: {
          serviceId: serviceId(definition.serviceSlug),
          metricDefinitionId: metricDefinitionId(definition.serviceSlug, definition.name),
          actorUserId: userId("developer"),
          type: "metric_created",
          message: `${definition.displayName} metric is available for production queries.`,
          fromValue: null,
          toValue: definition.name,
          metadata: { source: seedSource },
          createdAt: minutesAgo(3_850)
        },
        create: {
          id: id(`metric-timeline:${definition.serviceSlug}:${definition.name}`),
          serviceId: serviceId(definition.serviceSlug),
          metricDefinitionId: metricDefinitionId(definition.serviceSlug, definition.name),
          actorUserId: userId("developer"),
          type: "metric_created",
          message: `${definition.displayName} metric is available for production queries.`,
          fromValue: null,
          toValue: definition.name,
          metadata: { source: seedSource },
          createdAt: minutesAgo(3_850)
        }
      });
    }

    for (const seedSeries of metricSeries) {
      const labelHash = hashLabels(seedSeries.labels);
      await transaction.metricSeries.upsert({
        where: {
          metricDefinitionId_labelHash_source: {
            metricDefinitionId: metricDefinitionId(seedSeries.serviceSlug, seedSeries.metricName),
            labelHash,
            source: seedSource
          }
        },
        update: {
          serviceId: serviceId(seedSeries.serviceSlug),
          labels: seedSeries.labels,
          lastSampleAt: minutesAgo(2)
        },
        create: {
          id: metricSeriesId(seedSeries.serviceSlug, seedSeries.metricName),
          metricDefinitionId: metricDefinitionId(seedSeries.serviceSlug, seedSeries.metricName),
          serviceId: serviceId(seedSeries.serviceSlug),
          labelHash,
          labels: seedSeries.labels,
          source: seedSource,
          createdAt: minutesAgo(3_800),
          lastSampleAt: minutesAgo(2)
        }
      });
    }
  });

  const seededDefinitionIds = metricDefinitions.map((definition) =>
    metricDefinitionId(definition.serviceSlug, definition.name)
  );
  await prisma.metricSample.deleteMany({
    where: {
      source: seedSource,
      metricDefinitionId: {
        in: seededDefinitionIds
      }
    }
  });

  await prisma.metricSample.createMany({
    data: metricSamples.flatMap((seedMetric) => {
      const labelsForSeries = metricSeries.find(
        (entry) =>
          entry.serviceSlug === seedMetric.serviceSlug && entry.metricName === seedMetric.metricName
      )?.labels;

      if (!labelsForSeries) {
        throw new Error(`Missing metric series for ${seedMetric.serviceSlug}:${seedMetric.metricName}`);
      }

      return seedMetric.values.map((value, index) => ({
        id: id(`metric-sample:${seedMetric.serviceSlug}:${seedMetric.metricName}:${index}`),
        metricDefinitionId: metricDefinitionId(seedMetric.serviceSlug, seedMetric.metricName),
        metricSeriesId: metricSeriesId(seedMetric.serviceSlug, seedMetric.metricName),
        serviceId: serviceId(seedMetric.serviceSlug),
        timestamp: minutesAgo((seedMetric.values.length - index) * 5),
        value,
        labels: labelsForSeries,
        source: seedSource,
        retentionPolicyId,
        createdAt: minutesAgo((seedMetric.values.length - index) * 5)
      }));
    })
  });
}

async function seedAlerts(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const rule of alertRules) {
      await transaction.alertRule.upsert({
        where: { id: alertRuleId(rule.key) },
        update: alertRuleWrite(rule),
        create: {
          id: alertRuleId(rule.key),
          ...alertRuleWrite(rule),
          createdAt: minutesAgo(3_200)
        }
      });

      const observedValue = observedAlertValue(rule.key);
      await transaction.alertEvaluation.upsert({
        where: { id: id(`alert-evaluation:${rule.key}:latest`) },
        update: {
          alertRuleId: alertRuleId(rule.key),
          previousState: rule.state === "OK" ? "OK" : "PENDING",
          state: rule.state,
          observedValue,
          thresholdSummary: alertThresholdSummary(rule),
          message: alertMessage(rule, observedValue),
          evaluatedAt: minutesAgo(2)
        },
        create: {
          id: id(`alert-evaluation:${rule.key}:latest`),
          alertRuleId: alertRuleId(rule.key),
          previousState: rule.state === "OK" ? "OK" : "PENDING",
          state: rule.state,
          observedValue,
          thresholdSummary: alertThresholdSummary(rule),
          message: alertMessage(rule, observedValue),
          evaluatedAt: minutesAgo(2),
          createdAt: minutesAgo(2)
        }
      });

      await transaction.alertTimelineEvent.upsert({
        where: { id: id(`alert-timeline:${rule.key}:latest`) },
        update: {
          alertRuleId: alertRuleId(rule.key),
          actorUserId: userId("manager"),
          type: rule.state === "OK" ? "alert_evaluated" : "alert_evaluated",
          message: alertMessage(rule, observedValue),
          fromState: rule.state === "OK" ? "OK" : "PENDING",
          toState: rule.state,
          metadata: { source: seedSource },
          createdAt: minutesAgo(2)
        },
        create: {
          id: id(`alert-timeline:${rule.key}:latest`),
          alertRuleId: alertRuleId(rule.key),
          actorUserId: userId("manager"),
          type: "alert_evaluated",
          message: alertMessage(rule, observedValue),
          fromState: rule.state === "OK" ? "OK" : "PENDING",
          toState: rule.state,
          metadata: { source: seedSource },
          createdAt: minutesAgo(2)
        }
      });
    }
  });
}

async function seedIncidents(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    for (const seedIncident of incidents) {
      await transaction.incident.upsert({
        where: { id: incidentId(seedIncident.key) },
        update: {
          title: seedIncident.title,
          description: seedIncident.description,
          severity: seedIncident.severity,
          priority: seedIncident.priority,
          status: seedIncident.status,
          serviceId: serviceId(seedIncident.serviceSlug),
          reporterId: userId(seedIncident.reporterKey),
          assigneeId: seedIncident.assigneeKey ? userId(seedIncident.assigneeKey) : null,
          customerImpact: seedIncident.customerImpact,
          startedAt: minutesAgo(seedIncident.startedMinutesAgo),
          resolvedAt:
            seedIncident.resolvedMinutesAgo === null
              ? null
              : minutesAgo(seedIncident.resolvedMinutesAgo),
          closedAt:
            seedIncident.closedMinutesAgo === null ? null : minutesAgo(seedIncident.closedMinutesAgo),
          deletedAt: null
        },
        create: {
          id: incidentId(seedIncident.key),
          title: seedIncident.title,
          description: seedIncident.description,
          severity: seedIncident.severity,
          priority: seedIncident.priority,
          status: seedIncident.status,
          serviceId: serviceId(seedIncident.serviceSlug),
          reporterId: userId(seedIncident.reporterKey),
          assigneeId: seedIncident.assigneeKey ? userId(seedIncident.assigneeKey) : null,
          customerImpact: seedIncident.customerImpact,
          startedAt: minutesAgo(seedIncident.startedMinutesAgo),
          resolvedAt:
            seedIncident.resolvedMinutesAgo === null
              ? null
              : minutesAgo(seedIncident.resolvedMinutesAgo),
          closedAt:
            seedIncident.closedMinutesAgo === null ? null : minutesAgo(seedIncident.closedMinutesAgo),
          createdAt: minutesAgo(seedIncident.startedMinutesAgo)
        }
      });

      await transaction.incidentTimelineEvent.upsert({
        where: { id: id(`incident-timeline:${seedIncident.key}:created`) },
        update: {
          incidentId: incidentId(seedIncident.key),
          actorUserId: userId(seedIncident.reporterKey),
          type: "incident_created",
          message: `${seedIncident.title} was opened for ${seedIncident.serviceSlug}.`,
          metadata: { source: seedSource, tags: seedIncident.tags },
          createdAt: minutesAgo(seedIncident.startedMinutesAgo)
        },
        create: {
          id: id(`incident-timeline:${seedIncident.key}:created`),
          incidentId: incidentId(seedIncident.key),
          actorUserId: userId(seedIncident.reporterKey),
          type: "incident_created",
          message: `${seedIncident.title} was opened for ${seedIncident.serviceSlug}.`,
          metadata: { source: seedSource, tags: seedIncident.tags },
          createdAt: minutesAgo(seedIncident.startedMinutesAgo)
        }
      });

      await transaction.incidentTimelineEvent.upsert({
        where: { id: id(`incident-timeline:${seedIncident.key}:status`) },
        update: {
          incidentId: incidentId(seedIncident.key),
          actorUserId: userId("manager"),
          type: "status_changed",
          message: `Incident status changed to ${seedIncident.status.toLowerCase()}.`,
          metadata: { source: seedSource, status: seedIncident.status },
          createdAt: minutesAgo(Math.max(seedIncident.startedMinutesAgo - 16, 1))
        },
        create: {
          id: id(`incident-timeline:${seedIncident.key}:status`),
          incidentId: incidentId(seedIncident.key),
          actorUserId: userId("manager"),
          type: "status_changed",
          message: `Incident status changed to ${seedIncident.status.toLowerCase()}.`,
          metadata: { source: seedSource, status: seedIncident.status },
          createdAt: minutesAgo(Math.max(seedIncident.startedMinutesAgo - 16, 1))
        }
      });
    }

    for (const seedComment of incidentComments) {
      await transaction.incidentComment.upsert({
        where: { id: commentId(seedComment.incidentKey, seedComment.key) },
        update: {
          incidentId: incidentId(seedComment.incidentKey),
          authorId: userId(seedComment.authorKey),
          body: seedComment.body,
          editedAt: null,
          createdAt: minutesAgo(seedComment.minutesAgo),
          deletedAt: null
        },
        create: {
          id: commentId(seedComment.incidentKey, seedComment.key),
          incidentId: incidentId(seedComment.incidentKey),
          authorId: userId(seedComment.authorKey),
          body: seedComment.body,
          createdAt: minutesAgo(seedComment.minutesAgo)
        }
      });

      await transaction.incidentTimelineEvent.upsert({
        where: { id: id(`incident-timeline:${seedComment.incidentKey}:comment:${seedComment.key}`) },
        update: {
          incidentId: incidentId(seedComment.incidentKey),
          actorUserId: userId(seedComment.authorKey),
          type: "comment_added",
          message: `${userName(seedComment.authorKey)} commented on the incident.`,
          metadata: {
            source: seedSource,
            commentId: commentId(seedComment.incidentKey, seedComment.key)
          },
          createdAt: minutesAgo(seedComment.minutesAgo)
        },
        create: {
          id: id(`incident-timeline:${seedComment.incidentKey}:comment:${seedComment.key}`),
          incidentId: incidentId(seedComment.incidentKey),
          actorUserId: userId(seedComment.authorKey),
          type: "comment_added",
          message: `${userName(seedComment.authorKey)} commented on the incident.`,
          metadata: {
            source: seedSource,
            commentId: commentId(seedComment.incidentKey, seedComment.key)
          },
          createdAt: minutesAgo(seedComment.minutesAgo)
        }
      });

      for (const mentionedUserKey of seedComment.mentions) {
        await transaction.incidentMention.upsert({
          where: {
            commentId_mentionedUserId: {
              commentId: commentId(seedComment.incidentKey, seedComment.key),
              mentionedUserId: userId(mentionedUserKey)
            }
          },
          update: {
            handle: userHandle(mentionedUserKey)
          },
          create: {
            id: id(`incident-mention:${seedComment.incidentKey}:${seedComment.key}:${mentionedUserKey}`),
            incidentId: incidentId(seedComment.incidentKey),
            commentId: commentId(seedComment.incidentKey, seedComment.key),
            mentionedUserId: userId(mentionedUserKey),
            handle: userHandle(mentionedUserKey),
            createdAt: minutesAgo(seedComment.minutesAgo)
          }
        });
      }
    }

    await transaction.incidentAttachment.upsert({
      where: { storageKey: "seed/incidents/checkout-latency/latency-waterfall.json" },
      update: {
        incidentId: incidentId("checkout-latency"),
        uploadedByUserId: userId("developer"),
        filename: "latency-waterfall.json",
        contentType: "application/json",
        size: 18_420,
        uploadedAt: minutesAgo(24),
        deletedAt: null
      },
      create: {
        id: id("incident-attachment:checkout-latency:waterfall"),
        incidentId: incidentId("checkout-latency"),
        uploadedByUserId: userId("developer"),
        filename: "latency-waterfall.json",
        contentType: "application/json",
        size: 18_420,
        storageKey: "seed/incidents/checkout-latency/latency-waterfall.json",
        uploadedAt: minutesAgo(24)
      }
    });

    await transaction.incidentTimelineEvent.upsert({
      where: { id: id("incident-timeline:checkout-latency:attachment") },
      update: {
        incidentId: incidentId("checkout-latency"),
        actorUserId: userId("developer"),
        type: "attachment_added",
        message: "Latency waterfall evidence was attached.",
        metadata: {
          source: seedSource,
          filename: "latency-waterfall.json"
        },
        createdAt: minutesAgo(24)
      },
      create: {
        id: id("incident-timeline:checkout-latency:attachment"),
        incidentId: incidentId("checkout-latency"),
        actorUserId: userId("developer"),
        type: "attachment_added",
        message: "Latency waterfall evidence was attached.",
        metadata: {
          source: seedSource,
          filename: "latency-waterfall.json"
        },
        createdAt: minutesAgo(24)
      }
    });
  });
}

async function seedAI(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const providerConfigIds = new Map<string, string>();

    for (const seedProvider of providers) {
      const record = await transaction.providerConfiguration.upsert({
        where: { provider: seedProvider.provider },
        update: {
          displayName: seedProvider.displayName,
          model: seedProvider.model,
          isEnabled: true,
          priority: seedProvider.priority,
          maxTokens: 4_096,
          temperature: 0.2,
          costPer1KInputTokens: seedProvider.costPer1KInputTokens,
          costPer1KOutputTokens: seedProvider.costPer1KOutputTokens
        },
        create: {
          id: providerConfigurationId(seedProvider.provider),
          provider: seedProvider.provider,
          displayName: seedProvider.displayName,
          model: seedProvider.model,
          isEnabled: true,
          priority: seedProvider.priority,
          maxTokens: 4_096,
          temperature: 0.2,
          costPer1KInputTokens: seedProvider.costPer1KInputTokens,
          costPer1KOutputTokens: seedProvider.costPer1KOutputTokens,
          createdAt: minutesAgo(2_800)
        }
      });

      providerConfigIds.set(seedProvider.provider, record.id);
    }

    for (const template of promptTemplates) {
      await transaction.promptTemplate.upsert({
        where: {
          key_version: {
            key: template.key,
            version: template.version
          }
        },
        update: {
          name: template.name,
          description: template.description,
          feature: template.feature,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          variables: template.variables,
          isActive: true,
          createdByUserId: userId("manager")
        },
        create: {
          id: id(`prompt-template:${template.key}:${template.version}`),
          key: template.key,
          version: template.version,
          name: template.name,
          description: template.description,
          feature: template.feature,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          variables: template.variables,
          isActive: true,
          createdByUserId: userId("manager"),
          createdAt: minutesAgo(2_760)
        }
      });
    }

    const conversationId = id("ai-conversation:checkout-latency-triage");
    const assistantMessageId = id("ai-message:checkout-latency-triage:assistant");
    const openAIProviderConfigId = providerConfigIds.get("OPENAI") ?? providerConfigurationId("OPENAI");

    await transaction.aIConversation.upsert({
      where: { id: conversationId },
      update: {
        title: "Checkout latency triage",
        feature: "INCIDENT_SUMMARIZATION",
        provider: "OPENAI",
        model: "gpt-simulated-plusops",
        providerConfigId: openAIProviderConfigId,
        actorUserId: userId("developer"),
        context: {
          incidentId: incidentId("checkout-latency"),
          serviceId: serviceId("checkout"),
          source: seedSource
        },
        deletedAt: null
      },
      create: {
        id: conversationId,
        title: "Checkout latency triage",
        feature: "INCIDENT_SUMMARIZATION",
        provider: "OPENAI",
        model: "gpt-simulated-plusops",
        providerConfigId: openAIProviderConfigId,
        actorUserId: userId("developer"),
        context: {
          incidentId: incidentId("checkout-latency"),
          serviceId: serviceId("checkout"),
          source: seedSource
        },
        createdAt: minutesAgo(26)
      }
    });

    const messages = [
      {
        id: id("ai-message:checkout-latency-triage:user"),
        role: "USER",
        content: "Summarize why checkout latency is increasing and list the next checks.",
        tokenCount: 18,
        createdAt: minutesAgo(26)
      },
      {
        id: assistantMessageId,
        role: "ASSISTANT",
        content:
          "Checkout latency is most likely linked to Payments API processor authorization latency. Database checks are healthy, but synthetic processor checks are failing.",
        tokenCount: 42,
        createdAt: minutesAgo(25)
      }
    ] as const;

    for (const message of messages) {
      await transaction.aIConversationMessage.upsert({
        where: { id: message.id },
        update: {
          conversationId,
          role: message.role,
          content: message.content,
          metadata: { source: seedSource },
          tokenCount: message.tokenCount,
          createdAt: message.createdAt
        },
        create: {
          id: message.id,
          conversationId,
          role: message.role,
          content: message.content,
          metadata: { source: seedSource },
          tokenCount: message.tokenCount,
          createdAt: message.createdAt
        }
      });
    }

    await transaction.aIUsageRecord.upsert({
      where: { id: id("ai-usage:checkout-latency-triage") },
      update: {
        provider: "OPENAI",
        model: "gpt-simulated-plusops",
        feature: "INCIDENT_SUMMARIZATION",
        providerConfigId: openAIProviderConfigId,
        conversationId,
        conversationMessageId: assistantMessageId,
        promptTokens: 118,
        completionTokens: 42,
        totalTokens: 160,
        latencyMs: 642,
        estimatedCostUsd: 0.0012,
        status: "SUCCEEDED",
        errorMessage: null,
        createdAt: minutesAgo(25)
      },
      create: {
        id: id("ai-usage:checkout-latency-triage"),
        provider: "OPENAI",
        model: "gpt-simulated-plusops",
        feature: "INCIDENT_SUMMARIZATION",
        providerConfigId: openAIProviderConfigId,
        conversationId,
        conversationMessageId: assistantMessageId,
        promptTokens: 118,
        completionTokens: 42,
        totalTokens: 160,
        latencyMs: 642,
        estimatedCostUsd: 0.0012,
        status: "SUCCEEDED",
        errorMessage: null,
        createdAt: minutesAgo(25)
      }
    });

    await transaction.aIAuditEvent.upsert({
      where: { id: id("ai-audit:checkout-latency-triage") },
      update: {
        actorUserId: userId("developer"),
        action: "ai.request_completed",
        feature: "INCIDENT_SUMMARIZATION",
        provider: "OPENAI",
        entityType: "Incident",
        entityId: incidentId("checkout-latency"),
        metadata: {
          source: seedSource,
          conversationId
        },
        createdAt: minutesAgo(25)
      },
      create: {
        id: id("ai-audit:checkout-latency-triage"),
        actorUserId: userId("developer"),
        action: "ai.request_completed",
        feature: "INCIDENT_SUMMARIZATION",
        provider: "OPENAI",
        entityType: "Incident",
        entityId: incidentId("checkout-latency"),
        metadata: {
          source: seedSource,
          conversationId
        },
        createdAt: minutesAgo(25)
      }
    });
  });
}

async function seedAuditLogs(): Promise<void> {
  const entries = [
    audit("service.seeded", "Service", serviceId("payments-api"), "developer", 3_800),
    audit("health.evaluation.seeded", "Service", serviceId("payments-api"), "developer", 42),
    audit("alert.evaluation.seeded", "AlertRule", alertRuleId("payments-api-latency"), "manager", 2),
    audit("incident.seeded", "Incident", incidentId("checkout-latency"), "manager", 54),
    audit("ai.seeded", "AIConversation", id("ai-conversation:checkout-latency-triage"), "developer", 25)
  ] as const;

  for (const entry of entries) {
    await prisma.auditLog.upsert({
      where: { id: id(`audit:${entry.action}:${entry.entityId}`) },
      update: {
        actorUserId: userId(entry.actorKey),
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: { source: seedSource },
        createdAt: minutesAgo(entry.minutesAgo)
      },
      create: {
        id: id(`audit:${entry.action}:${entry.entityId}`),
        actorUserId: userId(entry.actorKey),
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: { source: seedSource },
        createdAt: minutesAgo(entry.minutesAgo)
      }
    });
  }
}

async function collectCounts(): Promise<Record<string, number>> {
  const [
    userCount,
    teamCount,
    serviceCount,
    healthCheckCount,
    metricDefinitionCount,
    metricSampleCount,
    alertRuleCount,
    incidentCount,
    providerCount
  ] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: "@plusops.local" } } }),
    prisma.team.count({ where: { slug: { in: teams.map((teamRecord) => teamRecord.slug) } } }),
    prisma.service.count({
      where: { slug: { in: services.map((serviceRecord) => serviceRecord.slug) } }
    }),
    prisma.healthCheck.count({
      where: { id: { in: healthChecks.map((check) => healthCheckId(check.serviceSlug, check.key)) } }
    }),
    prisma.metricDefinition.count({
      where: {
        id: {
          in: metricDefinitions.map((definition) =>
            metricDefinitionId(definition.serviceSlug, definition.name)
          )
        }
      }
    }),
    prisma.metricSample.count({
      where: { source: seedSource }
    }),
    prisma.alertRule.count({
      where: { id: { in: alertRules.map((rule) => alertRuleId(rule.key)) } }
    }),
    prisma.incident.count({
      where: { id: { in: incidents.map((seedIncident) => incidentId(seedIncident.key)) } }
    }),
    prisma.providerConfiguration.count({
      where: { provider: { in: providers.map((entry) => entry.provider) } }
    })
  ]);

  return {
    users: userCount,
    teams: teamCount,
    services: serviceCount,
    healthChecks: healthCheckCount,
    metricDefinitions: metricDefinitionCount,
    metricSamples: metricSampleCount,
    alertRules: alertRuleCount,
    incidents: incidentCount,
    aiProviders: providerCount
  };
}

function user(key: string, email: string, name: string, role: UserRole) {
  return { key, email, name, role };
}

function team(slug: string, name: string) {
  return { slug, name };
}

function environment(
  slug: string,
  name: string,
  type: "PRODUCTION" | "STAGING" | "DEVELOPMENT",
  description: string
) {
  return { slug, name, type, description };
}

function service(slug: string, name: string, ownerTeamSlug: string, tier: number, description: string) {
  return { slug, name, ownerTeamSlug, tier, description };
}

function dependency(upstreamServiceSlug: string, downstreamServiceSlug: string, description: string) {
  return { upstreamServiceSlug, downstreamServiceSlug, description };
}

function deployment(
  serviceSlug: string,
  environmentSlug: string,
  version: string,
  commitSha: string,
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "ROLLED_BACK",
  startedMinutesAgo: number,
  finishedMinutesAgo: number | null
) {
  return {
    serviceSlug,
    environmentSlug,
    version,
    commitSha,
    status,
    startedMinutesAgo,
    finishedMinutesAgo
  };
}

function healthCheck(
  serviceSlug: string,
  key: string,
  name: string,
  type: "HTTP_ENDPOINT" | "TCP" | "SYNTHETIC" | "DEPENDENCY" | "DATABASE" | "CACHE",
  target: string,
  isCritical: boolean,
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN",
  responseTimeMs: number
) {
  return { serviceSlug, key, name, type, target, isCritical, status, responseTimeMs };
}

function evaluation(
  serviceSlug: string,
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN",
  summary: string,
  minutesAgoValue: number
) {
  return { serviceSlug, status, summary, minutesAgo: minutesAgoValue };
}

function incident(
  key: string,
  title: string,
  description: string,
  severity: "SEV1" | "SEV2" | "SEV3" | "SEV4",
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW",
  status: "OPEN" | "INVESTIGATING" | "IDENTIFIED" | "MITIGATED" | "MONITORING" | "RESOLVED" | "CLOSED",
  serviceSlug: string,
  reporterKey: string,
  assigneeKey: string | null,
  customerImpact: string,
  startedMinutesAgo: number,
  resolvedMinutesAgo: number | null,
  closedMinutesAgo: number | null,
  tags: string[]
) {
  return {
    key,
    title,
    description,
    severity,
    priority,
    status,
    serviceSlug,
    reporterKey,
    assigneeKey,
    customerImpact,
    startedMinutesAgo,
    resolvedMinutesAgo,
    closedMinutesAgo,
    tags
  };
}

function comment(
  incidentKey: string,
  key: string,
  authorKey: string,
  body: string,
  minutesAgoValue: number,
  mentions: string[]
) {
  return { incidentKey, key, authorKey, body, minutesAgo: minutesAgoValue, mentions };
}

function metricDefinition(
  serviceSlug: string,
  name: string,
  displayName: string,
  type: "COUNTER" | "GAUGE" | "HISTOGRAM" | "SUMMARY" | "STATE",
  unit: "MILLISECONDS" | "SECONDS" | "BYTES" | "PERCENT" | "COUNT" | "REQUESTS" | "ERRORS" | "CUSTOM",
  defaultAggregation:
    | "AVERAGE"
    | "MINIMUM"
    | "MAXIMUM"
    | "SUM"
    | "COUNT"
    | "RATE"
    | "PERCENTILE"
    | "MOVING_AVERAGE"
) {
  return { serviceSlug, name, displayName, type, unit, defaultAggregation };
}

function series(serviceSlug: string, metricName: string, metricLabels: MetricLabel[]) {
  return { serviceSlug, metricName, labels: metricLabels };
}

function samples(serviceSlug: string, metricName: string, values: number[]) {
  return { serviceSlug, metricName, values };
}

function labels(
  serviceSlug: string,
  environmentSlug: string,
  extras: Record<string, string> = {}
): MetricLabel[] {
  return [
    { key: "service", value: serviceSlug },
    { key: "environment", value: environmentSlug },
    ...Object.entries(extras).map(([key, value]) => ({ key, value }))
  ];
}

function alertRule(
  key: string,
  name: string,
  description: string,
  severity: "CRITICAL" | "WARNING" | "INFO",
  state: "OK" | "PENDING" | "FIRING" | "RESOLVED" | "MUTED",
  serviceSlug: string,
  metricName: string,
  aggregation:
    | "AVERAGE"
    | "MINIMUM"
    | "MAXIMUM"
    | "SUM"
    | "COUNT"
    | "RATE"
    | "PERCENTILE"
    | "MOVING_AVERAGE",
  percentile: number | null,
  operator: "GREATER_THAN" | "LESS_THAN" | "EQUALS" | "NOT_EQUALS" | "BETWEEN" | "OUTSIDE_RANGE",
  thresholdValue: number | null,
  thresholdMin: number | null,
  thresholdMax: number | null
) {
  return {
    key,
    name,
    description,
    severity,
    state,
    serviceSlug,
    metricName,
    aggregation,
    percentile,
    operator,
    thresholdValue,
    thresholdMin,
    thresholdMax
  };
}

function alertRuleWrite(rule: ReturnType<typeof alertRule>): Prisma.AlertRuleUncheckedCreateInput {
  return {
    name: rule.name,
    description: rule.description,
    severity: rule.severity,
    state: rule.state,
    metricName: rule.metricName,
    metricDefinitionId: metricDefinitionId(rule.serviceSlug, rule.metricName),
    serviceId: serviceId(rule.serviceSlug),
    filters: labels(rule.serviceSlug, "production"),
    aggregation: rule.aggregation,
    percentile: rule.percentile,
    evaluationWindowSeconds: 3_600,
    operator: rule.operator,
    thresholdValue: rule.thresholdValue,
    thresholdMin: rule.thresholdMin,
    thresholdMax: rule.thresholdMax,
    isEnabled: true,
    mutedUntil: null,
    deletedAt: null
  };
}

function provider(
  providerType: "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ",
  displayName: string,
  model: string,
  priority: number,
  costPer1KInputTokens: number,
  costPer1KOutputTokens: number
) {
  return {
    provider: providerType,
    displayName,
    model,
    priority,
    costPer1KInputTokens,
    costPer1KOutputTokens
  };
}

function promptTemplate(
  key: string,
  feature:
    | "CHAT"
    | "LOG_ANALYSIS"
    | "STACKTRACE_EXPLANATION"
    | "INCIDENT_SUMMARIZATION"
    | "SQL_GENERATION"
    | "API_DOCUMENTATION"
    | "RELEASE_NOTES"
    | "PLAYGROUND",
  name: string,
  systemPrompt: string,
  userPrompt: string,
  variables: Prisma.InputJsonValue
) {
  return {
    key,
    version: 1,
    name,
    description: null,
    feature,
    systemPrompt,
    userPrompt,
    variables
  };
}

function variable(name: string, defaultValue: string | null = null, required = true) {
  return {
    name,
    description: null,
    required,
    defaultValue
  };
}

function audit(
  action: string,
  entityType: string,
  entityId: string,
  actorKey: string,
  minutesAgoValue: number
) {
  return { action, entityType, entityId, actorKey, minutesAgo: minutesAgoValue };
}

function userId(key: string): string {
  return id(`user:${key}`);
}

function teamId(slug: string): string {
  return id(`team:${slug}`);
}

function environmentId(slug: string): string {
  return id(`environment:${slug}`);
}

function serviceId(slug: string): string {
  return id(`service:${slug}`);
}

function healthCheckId(serviceSlug: string, key: string): string {
  return id(`health-check:${serviceSlug}:${key}`);
}

function metricDefinitionId(serviceSlug: string, name: string): string {
  return id(`metric-definition:${serviceSlug}:${name}`);
}

function metricSeriesId(serviceSlug: string, metricName: string): string {
  return id(`metric-series:${serviceSlug}:${metricName}`);
}

function alertRuleId(key: string): string {
  return id(`alert-rule:${key}`);
}

function incidentId(key: string): string {
  return id(`incident:${key}`);
}

function commentId(incidentKey: string, commentKey: string): string {
  return id(`incident-comment:${incidentKey}:${commentKey}`);
}

function providerConfigurationId(providerType: string): string {
  return id(`provider-configuration:${providerType.toLowerCase()}`);
}

function id(key: string): string {
  const hex = createHash("sha1").update(`plusops:${key}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16] ?? "8", 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");

  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
    16,
    20
  )}-${value.slice(20)}`;
}

function minutesAgo(minutes: number): Date {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

function hashLabels(metricLabels: MetricLabel[]): string {
  const normalized = [...metricLabels].sort((left, right) => left.key.localeCompare(right.key));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function describePermission(permissionKey: PermissionKey): string {
  const [resource, action] = permissionKey.split(":");
  return `Allows ${action ?? "requested"} access for ${resource ?? "the resource"}.`;
}

function healthResultMessage(status: string, name: string): string {
  switch (status) {
    case "HEALTHY":
      return `${name} is responding within expected thresholds.`;
    case "DEGRADED":
      return `${name} is responding, but latency is above the normal operating band.`;
    case "UNHEALTHY":
      return `${name} failed the latest simulated check.`;
    default:
      return `${name} has no recent result.`;
  }
}

function previousHealthStatus(status: string): "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN" {
  return status === "HEALTHY" ? "HEALTHY" : "HEALTHY";
}

function historicalHealthSummary(status: string): string {
  return status === "HEALTHY"
    ? "Service was healthy before the current operational event."
    : "Service health changed before the current seeded state.";
}

function observedAlertValue(key: string): number {
  switch (key) {
    case "payments-api-latency":
      return 740;
    case "payments-api-error-rate":
      return 6.7;
    case "notifications-queue-depth":
      return 421;
    case "auth-availability":
      return 100;
    default:
      return 0;
  }
}

function alertThresholdSummary(rule: ReturnType<typeof alertRule>): string {
  if (rule.thresholdValue !== null) {
    return `${rule.metricName} ${rule.operator.toLowerCase()} ${rule.thresholdValue}`;
  }

  return `${rule.metricName} ${rule.operator.toLowerCase()} ${rule.thresholdMin}..${rule.thresholdMax}`;
}

function alertMessage(rule: ReturnType<typeof alertRule>, observedValue: number): string {
  return `${rule.name} evaluated at ${observedValue}.`;
}

function userName(key: string): string {
  return users.find((seedUser) => seedUser.key === key)?.name ?? key;
}

function userHandle(key: string): string {
  const seedUser = users.find((entry) => entry.key === key);
  return seedUser ? seedUser.email.split("@")[0] ?? key : key;
}

function ensureDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before running pnpm db:seed.");
  }
}

function loadEnv(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function unquote(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

type MetricLabel = {
  key: string;
  value: string;
};

main()
  .catch((error: unknown) => {
    console.error("PlusOps seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
