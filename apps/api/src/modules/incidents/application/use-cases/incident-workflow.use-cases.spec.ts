import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { IncidentPriority, IncidentSeverity } from "@plusops/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthAuditLogPort, ClockPort } from "../../../auth/application/ports";
import type { AuthenticatedUser } from "../../../auth/presentation/http/authenticated-user";
import { Incident, type IncidentTimelineEvent } from "../../domain";
import type {
  IncidentDetailRecord,
  IncidentListResult,
  IncidentRepositoryPort,
  SaveIncidentOptions
} from "../ports";
import { AssignIncidentUseCase } from "./assign-incident.use-case";
import { ChangeIncidentSeverityUseCase } from "./change-incident-severity.use-case";
import { ChangeIncidentStatusUseCase } from "./change-incident-status.use-case";
import { CloseIncidentUseCase } from "./close-incident.use-case";
import { ReopenIncidentUseCase } from "./reopen-incident.use-case";
import { ResolveIncidentUseCase } from "./resolve-incident.use-case";

const fixedNow = new Date("2026-08-07T11:00:00.000Z");

describe("Incident workflow use cases", () => {
  let incidentRepository: FakeIncidentRepository;
  let auditLog: FakeAuditLog;

  beforeEach(() => {
    incidentRepository = new FakeIncidentRepository();
    auditLog = new FakeAuditLog();
  });

  it("moves an owned incident through a valid status transition", async () => {
    const useCase = new ChangeIncidentStatusUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    const result = await useCase.execute({
      actor: developerActor(),
      incidentId: incidentId(),
      status: "investigating"
    });

    expect(result.incident.status).toBe("investigating");
    expect(incidentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      type: "status_changed",
      message: "Incident status changed from open to investigating.",
      metadata: {
        previousStatus: "open",
        nextStatus: "investigating"
      }
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.status_changed",
        entityId: incidentId()
      })
    );
  });

  it("rejects invalid state transitions before persistence", async () => {
    const useCase = new ChangeIncidentStatusUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    await expect(
      useCase.execute({
        actor: developerActor(),
        incidentId: incidentId(),
        status: "monitoring"
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(incidentRepository.save).not.toHaveBeenCalled();
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it("keeps resolved and closed transitions behind dedicated workflow commands", async () => {
    const useCase = new ChangeIncidentStatusUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    await expect(
      useCase.execute({
        actor: developerActor(),
        incidentId: incidentId(),
        status: "resolved"
      })
    ).rejects.toThrow("Use the resolve incident endpoint.");
  });

  it("resolves a monitoring incident with timeline and audit evidence", async () => {
    incidentRepository.incident = createDomainIncident({
      status: "monitoring"
    });
    const useCase = new ResolveIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    const result = await useCase.execute({
      actor: developerActor(),
      incidentId: incidentId(),
      resolutionSummary: "Error rates returned to baseline."
    });

    expect(result.incident.status).toBe("resolved");
    expect(result.incident.resolvedAt).toBe("2026-08-07T11:00:00.000Z");
    expect(incidentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      type: "incident_resolved",
      metadata: {
        previousStatus: "monitoring",
        nextStatus: "resolved",
        resolutionSummary: "Error rates returned to baseline."
      }
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.resolved"
      })
    );
  });

  it("prevents closing before the incident is resolved", async () => {
    incidentRepository.incident = createDomainIncident({
      status: "monitoring"
    });
    const useCase = new CloseIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    await expect(
      useCase.execute({
        actor: developerActor(),
        incidentId: incidentId()
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reopens a resolved incident with an explicit reason", async () => {
    incidentRepository.incident = createDomainIncident({
      status: "resolved",
      resolvedAt: new Date("2026-08-07T10:30:00.000Z")
    });
    const useCase = new ReopenIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    const result = await useCase.execute({
      actor: developerActor(),
      incidentId: incidentId(),
      reason: "Error rates increased again."
    });

    expect(result.incident.status).toBe("investigating");
    expect(result.incident.resolvedAt).toBeNull();
    expect(incidentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      type: "incident_reopened",
      metadata: {
        reason: "Error rates increased again."
      }
    });
  });

  it("requires manage permission and an active assignee for assignment changes", async () => {
    incidentRepository.activeUserAvailable = false;
    const useCase = new AssignIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    await expect(
      useCase.execute({
        actor: developerActor(),
        incidentId: incidentId(),
        assigneeId: assigneeId()
      })
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      useCase.execute({
        actor: managerActor(),
        incidentId: incidentId(),
        assigneeId: assigneeId()
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("changes assignment and severity with manager permissions", async () => {
    const assignUseCase = new AssignIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );
    const severityUseCase = new ChangeIncidentSeverityUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(new Date("2026-08-07T11:05:00.000Z"))
    );

    await assignUseCase.execute({
      actor: managerActor(),
      incidentId: incidentId(),
      assigneeId: assigneeId()
    });
    await severityUseCase.execute({
      actor: managerActor(),
      incidentId: incidentId(),
      severity: "sev1"
    });

    expect(incidentRepository.timelineEvents.map((event) => event.toSnapshot().type)).toEqual([
      "assignee_changed",
      "severity_changed"
    ]);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.assignee_changed"
      })
    );
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.severity_changed"
      })
    );
  });
});

class FakeIncidentRepository implements IncidentRepositoryPort {
  incident = createDomainIncident();
  timelineEvents: IncidentTimelineEvent[] = [];
  activeUserAvailable = true;

  save = vi.fn(async (incident: Incident, options: SaveIncidentOptions = {}) => {
    this.incident = incident;
    this.timelineEvents.push(...(options.timelineEvents ?? []));
  });

  findById = vi.fn(async () => this.incident);

  findDetailById = vi.fn(async (): Promise<IncidentDetailRecord | null> =>
    createIncidentDetailRecord(this.incident, this.timelineEvents)
  );

  list = vi.fn(async (): Promise<IncidentListResult> => ({
    incidents: [],
    total: 0
  }));

  referencesExist = vi.fn(async () => true);
  activeUserExists = vi.fn(async () => this.activeUserAvailable);
}

class FakeAuditLog implements AuthAuditLogPort {
  record = vi.fn(async () => undefined);
}

class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}

function createIncidentDetailRecord(
  incident: Incident,
  timelineEvents: IncidentTimelineEvent[] = []
): IncidentDetailRecord {
  return {
    incident,
    serviceName: "Payments API",
    reporterName: "PlusOps Developer",
    assigneeName: null,
    comments: [],
    timeline: timelineEvents.map((event) => event.toSnapshot()),
    tags: []
  };
}

function createDomainIncident(
  overrides: Partial<ReturnType<Incident["toSnapshot"]>> = {}
): Incident {
  return Incident.restore({
    id: incidentId(),
    title: "Checkout authorization failures",
    description: "Authorization requests are timing out.",
    serviceId: serviceId(),
    reporterId: userId(),
    assigneeId: null,
    severity: "sev2" satisfies IncidentSeverity,
    priority: "high" satisfies IncidentPriority,
    status: "open",
    customerImpact: "Some customers cannot complete checkout.",
    startedAt: new Date("2026-08-07T09:55:00.000Z"),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date("2026-08-07T09:55:00.000Z"),
    updatedAt: new Date("2026-08-07T09:55:00.000Z"),
    deletedAt: null,
    ...overrides
  });
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["incidents:read", "incidents:write"]
  };
}

function managerActor(): AuthenticatedUser {
  return {
    id: "3c30f832-ac4c-4c2e-b5c1-7f5acacb0f0f",
    email: "manager@plusops.dev",
    sessionId: "17a76105-6ff4-44f6-9786-34a97b5f9b37",
    roles: ["engineering_manager"],
    permissions: ["incidents:read", "incidents:write", "incidents:manage"]
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function assigneeId(): string {
  return "6ea84cab-9758-42c4-9ebd-df36909e24c6";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}
