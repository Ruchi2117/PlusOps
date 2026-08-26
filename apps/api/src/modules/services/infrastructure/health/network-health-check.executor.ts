import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { connect } from "node:net";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  HealthCheckExecution,
  HealthCheckExecutorPort
} from "../../application/ports";
import type { HealthCheckSnapshot, ServiceSnapshot } from "../../domain";

@Injectable()
export class NetworkHealthCheckExecutor implements HealthCheckExecutorPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async execute(input: {
    healthCheck: HealthCheckSnapshot;
    service: ServiceSnapshot;
  }): Promise<HealthCheckExecution> {
    const { healthCheck, service } = input;

    if (!healthCheck.isEnabled) {
      return unknown("Health check is disabled.");
    }

    if (healthCheck.type === "database") {
      return this.executeDatabaseCheck();
    }

    if (healthCheck.type === "tcp") {
      return this.executeTcpCheck(healthCheck);
    }

    if (["http_endpoint", "synthetic"].includes(healthCheck.type)) {
      return this.executeHttpCheck(healthCheck, service);
    }

    if (healthCheck.type === "dependency") {
      return this.executeDependencyCheck(healthCheck);
    }

    return unknown(
      "No cache probe is configured. Configure a reachable HTTP or TCP health check instead."
    );
  }

  private async executeDatabaseCheck(): Promise<HealthCheckExecution> {
    const startedAt = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return healthy(performance.now() - startedAt, "PostgreSQL accepted a readiness query.");
    } catch (error) {
      return unhealthy(performance.now() - startedAt, failureMessage("PostgreSQL query failed", error));
    }
  }

  private async executeHttpCheck(
    healthCheck: HealthCheckSnapshot,
    service: ServiceSnapshot
  ): Promise<HealthCheckExecution> {
    const target = resolveHttpTarget(healthCheck.target, service.apiBaseUrl);
    if (!target) {
      return unknown("Health check requires an absolute HTTP target or a service API base URL.");
    }
    if (!isAllowedTarget(target, this.config.get<string>("HEALTH_CHECK_ALLOWED_HOSTS"))) {
      return unknown("Health check target is not in HEALTH_CHECK_ALLOWED_HOSTS.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), healthCheck.timeoutMs);
    const startedAt = performance.now();

    try {
      const response = await fetch(target, {
        method: configuredMethod(healthCheck.configuration),
        redirect: "manual",
        signal: controller.signal
      });
      const responseTimeMs = performance.now() - startedAt;
      const expectedStatus = configuredExpectedStatus(healthCheck.configuration);
      const passed = expectedStatus ? response.status === expectedStatus : response.ok;

      return passed
        ? healthy(responseTimeMs, `HTTP ${response.status} from ${target}.`)
        : unhealthy(responseTimeMs, `Unexpected HTTP ${response.status} from ${target}.`);
    } catch (error) {
      return unhealthy(performance.now() - startedAt, failureMessage(`HTTP probe failed for ${target}`, error));
    } finally {
      clearTimeout(timeout);
    }
  }

  private async executeDependencyCheck(
    healthCheck: HealthCheckSnapshot
  ): Promise<HealthCheckExecution> {
    if (!healthCheck.target) {
      return unknown("Dependency check requires a service slug target.");
    }

    const dependency = await this.prisma.service.findFirst({
      where: { slug: healthCheck.target, deletedAt: null },
      select: { apiBaseUrl: true }
    });
    if (!dependency?.apiBaseUrl) {
      return unknown(`Dependency ${healthCheck.target} has no API base URL to probe.`);
    }

    return this.executeHttpCheck(
      { ...healthCheck, target: dependency.apiBaseUrl, type: "http_endpoint" },
      { apiBaseUrl: dependency.apiBaseUrl } as ServiceSnapshot
    );
  }

  private executeTcpCheck(healthCheck: HealthCheckSnapshot): Promise<HealthCheckExecution> {
    const target = parseTcpTarget(healthCheck.target);
    if (!target) {
      return Promise.resolve(unknown("TCP check target must use host:port or tcp://host:port."));
    }
    if (!isAllowedHostname(target.hostname, this.config.get<string>("HEALTH_CHECK_ALLOWED_HOSTS"))) {
      return Promise.resolve(unknown("Health check target is not in HEALTH_CHECK_ALLOWED_HOSTS."));
    }

    const startedAt = performance.now();
    return new Promise((resolve) => {
      const socket = connect({ host: target.hostname, port: target.port });
      const finish = (result: HealthCheckExecution) => {
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(healthCheck.timeoutMs);
      socket.once("connect", () =>
        finish(healthy(performance.now() - startedAt, `TCP connection to ${target.label} succeeded.`))
      );
      socket.once("timeout", () =>
        finish(unhealthy(performance.now() - startedAt, `TCP connection to ${target.label} timed out.`))
      );
      socket.once("error", (error) =>
        finish(unhealthy(performance.now() - startedAt, failureMessage(`TCP connection to ${target.label} failed`, error)))
      );
    });
  }
}

function isAllowedTarget(target: string, allowList: string | undefined): boolean {
  return isAllowedHostname(new URL(target).hostname, allowList);
}

function isAllowedHostname(hostname: string, allowList: string | undefined): boolean {
  const normalized = hostname.toLowerCase();
  return (allowList ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) =>
      entry.startsWith("*.")
        ? normalized.endsWith(entry.slice(1)) && normalized !== entry.slice(2)
        : normalized === entry
    );
}

function resolveHttpTarget(target: string | null, baseUrl: string | null): string | null {
  try {
    if (target?.startsWith("http://") || target?.startsWith("https://")) {
      return new URL(target).toString();
    }
    if (target && baseUrl) {
      return new URL(target, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
    }
  } catch {
    return null;
  }
  return null;
}

function parseTcpTarget(target: string | null): { hostname: string; port: number; label: string } | null {
  if (!target) return null;
  try {
    const url = new URL(target.includes("://") ? target : `tcp://${target}`);
    const port = Number(url.port);
    return url.hostname && Number.isInteger(port) && port > 0 && port <= 65_535
      ? { hostname: url.hostname, port, label: `${url.hostname}:${port}` }
      : null;
  } catch {
    return null;
  }
}

function configuredMethod(configuration: Record<string, unknown> | null): string {
  const method = typeof configuration?.method === "string" ? configuration.method.toUpperCase() : "GET";
  return ["GET", "HEAD"].includes(method) ? method : "GET";
}

function configuredExpectedStatus(configuration: Record<string, unknown> | null): number | null {
  const value = configuration?.expectedStatus;
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : null;
}

function healthy(duration: number, message: string): HealthCheckExecution {
  return { status: "healthy", responseTimeMs: Math.max(0, Math.round(duration)), message };
}

function unhealthy(duration: number, message: string): HealthCheckExecution {
  return { status: "unhealthy", responseTimeMs: Math.max(0, Math.round(duration)), message };
}

function unknown(message: string): HealthCheckExecution {
  return { status: "unknown", responseTimeMs: null, message };
}

function failureMessage(prefix: string, error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${prefix} (${error.code}).`;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return `${prefix}: timed out.`;
  }
  return `${prefix}.`;
}
