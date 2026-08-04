import { Injectable } from "@nestjs/common";

import type {
  IncidentListQuery,
  IncidentListResult,
  IncidentRepositoryPort
} from "../../application/ports/incident-repository.port";
import { Incident } from "../../domain/incident.entity";

const now = new Date("2026-07-31T16:15:00.000Z");

@Injectable()
export class InMemoryIncidentRepository implements IncidentRepositoryPort {
  private readonly incidents = [
    Incident.restore({
      id: "7b6b90d1-d4d4-438a-8a38-665a7fe1a3bf",
      title: "Elevated payment authorization latency",
      serviceName: "Payments API",
      severity: "sev2",
      priority: "high",
      status: "investigating",
      assigneeName: "Aarav Mehta",
      startedAt: new Date("2026-07-31T14:42:00.000Z"),
      updatedAt: now,
      customerImpact: "Checkout authorization is slower for a subset of merchants."
    }),
    Incident.restore({
      id: "3e303e51-91c9-4063-96a2-172058fb81fd",
      title: "Billing reconciliation worker backlog",
      serviceName: "Billing Jobs",
      severity: "sev3",
      priority: "medium",
      status: "identified",
      assigneeName: "Maya Nair",
      startedAt: new Date("2026-07-31T12:18:00.000Z"),
      updatedAt: new Date("2026-07-31T15:57:00.000Z"),
      customerImpact: "Invoice sync is delayed for enterprise workspaces."
    })
  ];

  async list(query: IncidentListQuery): Promise<IncidentListResult> {
    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;

    return {
      incidents: this.incidents.slice(start, end),
      total: this.incidents.length
    };
  }
}
