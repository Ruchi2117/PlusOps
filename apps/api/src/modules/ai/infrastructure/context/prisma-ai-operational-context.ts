import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { AIOperationalContextPort } from "../../application/ports/ai-provider.port";

@Injectable()
export class PrismaAIOperationalContext implements AIOperationalContextPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async resolve(requestedContext: Record<string, unknown>): Promise<Record<string, unknown>> {
    const incidentId = stringValue(requestedContext.incidentId);
    const serviceId = stringValue(requestedContext.serviceId);
    const metadata = recordValue(requestedContext.metadata);
    const metricId = stringValue(metadata.metricId);
    const alertRuleId = stringValue(metadata.alertRuleId);

    const [incident, service, metric, alert, overview] = await Promise.all([
      incidentId ? this.incidentContext(incidentId) : null,
      serviceId ? this.serviceContext(serviceId) : null,
      metricId ? this.metricContext(metricId) : null,
      alertRuleId ? this.alertContext(alertRuleId) : null,
      !incidentId && !serviceId && !metricId && !alertRuleId ? this.overviewContext() : null
    ]);

    return compact({
      grounding: {
        source: "plusops-postgresql",
        retrievedAt: new Date().toISOString(),
        requested: requestedContext
      },
      incident,
      service,
      metric,
      alert,
      overview
    });
  }

  private incidentContext(id: string) {
    return this.prisma.incident.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        priority: true,
        status: true,
        customerImpact: true,
        startedAt: true,
        resolvedAt: true,
        updatedAt: true,
        service: { select: { id: true, name: true, slug: true, tier: true } },
        reporter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { body: true, createdAt: true, author: { select: { name: true } } }
        },
        timelineEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { type: true, message: true, metadata: true, createdAt: true }
        }
      }
    });
  }

  private serviceContext(id: string) {
    return this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        lifecycleStatus: true,
        tier: true,
        runbookUrl: true,
        ownerTeam: { select: { id: true, name: true, slug: true } },
        healthEvaluations: {
          orderBy: { evaluatedAt: "desc" },
          take: 3,
          select: { status: true, summary: true, evaluatedAt: true }
        },
        alertRules: {
          where: { deletedAt: null, isEnabled: true },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, name: true, severity: true, state: true, updatedAt: true }
        },
        incidents: {
          where: { deletedAt: null, status: { notIn: ["RESOLVED", "CLOSED"] } },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, title: true, severity: true, status: true, updatedAt: true }
        },
        deployments: {
          orderBy: { startedAt: "desc" },
          take: 5,
          select: { version: true, status: true, startedAt: true, finishedAt: true }
        },
        upstreamDependencies: {
          where: { deletedAt: null },
          select: { downstreamService: { select: { id: true, name: true, tier: true } } }
        },
        downstreamDependencies: {
          where: { deletedAt: null },
          select: { upstreamService: { select: { id: true, name: true, tier: true } } }
        }
      }
    });
  }

  private metricContext(id: string) {
    return this.prisma.metricDefinition.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        unit: true,
        defaultAggregation: true,
        service: { select: { id: true, name: true } },
        samples: {
          orderBy: { timestamp: "desc" },
          take: 30,
          select: { value: true, timestamp: true, labels: true, source: true }
        }
      }
    });
  }

  private alertContext(id: string) {
    return this.prisma.alertRule.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        severity: true,
        state: true,
        operator: true,
        thresholdValue: true,
        thresholdMin: true,
        thresholdMax: true,
        aggregation: true,
        service: { select: { id: true, name: true } },
        evaluations: {
          orderBy: { evaluatedAt: "desc" },
          take: 10,
          select: { state: true, observedValue: true, message: true, evaluatedAt: true }
        }
      }
    });
  }

  private async overviewContext() {
    const [incidents, alerts, health] = await Promise.all([
      this.prisma.incident.findMany({
        where: { deletedAt: null, status: { notIn: ["RESOLVED", "CLOSED"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, severity: true, status: true, service: { select: { id: true, name: true } } }
      }),
      this.prisma.alertRule.findMany({
        where: { deletedAt: null, isEnabled: true, state: { in: ["PENDING", "FIRING"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, severity: true, state: true, service: { select: { id: true, name: true } } }
      }),
      this.prisma.serviceHealthEvaluation.findMany({
        where: { status: { in: ["DEGRADED", "UNHEALTHY"] } },
        orderBy: { evaluatedAt: "desc" },
        take: 5,
        select: { status: true, summary: true, evaluatedAt: true, service: { select: { id: true, name: true } } }
      })
    ]);

    return { activeIncidents: incidents, activeAlerts: alerts, unhealthyServices: health };
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined));
}
