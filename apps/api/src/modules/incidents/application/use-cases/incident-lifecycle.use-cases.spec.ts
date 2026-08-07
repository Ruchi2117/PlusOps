import { ForbiddenException, NotFoundException } from "@nestjs/common";
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
import { CreateIncidentUseCase } from "./create-incident.use-case";
import { DeleteIncidentUseCase } from "./delete-incident.use-case";
import { GetIncidentUseCase } from "./get-incident.use-case";
import { ListIncidentsUseCase } from "./list-incidents.use-case";
import { UpdateIncidentUseCase } from "./update-incident.use-case";

const fixedNow = new Date("2026-08-07T10:00:00.000Z");

describe("Incident lifecycle use cases", () => {
  let incidentRepository: FakeIncidentRepository;
  let auditLog: FakeAuditLog;

  beforeEach(() => {
    incidentRepository = new FakeIncidentRepository();
    auditLog = new FakeAuditLog();
  });

  it("creates an incident, timeline event, and audit event", async () => {
    const useCase = new CreateIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    const result = await useCase.execute({
      actor: developerActor(),
      title: "Checkout authorization failures",
      description: "Authorization requests are timing out.",
      serviceId: serviceId(),
      severity: "sev2",
      priority: "high",
      customerImpact: "Some customers cannot complete checkout."
    });

    expect(incidentRepository.referencesExist).toHaveBeenCalledWith({
      serviceId: serviceId(),
      reporterId: userId()
    });
    expect(incidentRepository.save).toHaveBeenCalledWith(
      expect.any(Incident),
      expect.objectContaining({
        timelineEvents: [expect.anything()]
      })
    );
    expect(incidentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      incidentId: result.incident.id,
      actorUserId: userId(),
      type: "incident_created",
      message: "Incident created."
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: userId(),
        action: "incident.created",
        entityType: "Incident",
        entityId: result.incident.id
      })
    );
  });

  it("rejects incident creation when the referenced service is unavailable", async () => {
    incidentRepository.referencesAvailable = false;
    const useCase = new CreateIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    await expect(
      useCase.execute({
        actor: developerActor(),
        title: "Checkout authorization failures",
        serviceId: serviceId(),
        severity: "sev2",
        priority: "high"
      })
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(incidentRepository.save).not.toHaveBeenCalled();
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it("lists incidents with filters, sorting, and pagination metadata", async () => {
    incidentRepository.listTotal = 23;
    const useCase = new ListIncidentsUseCase(incidentRepository);

    const result = await useCase.execute({
      actor: viewerActor(),
      page: 2,
      pageSize: 10,
      status: "open",
      severity: "sev2",
      priority: "high",
      serviceId: serviceId(),
      includeDeleted: false,
      search: "checkout",
      sortBy: "createdAt",
      sortDirection: "asc"
    });

    expect(incidentRepository.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      filters: {
        status: "open",
        severity: "sev2",
        priority: "high",
        serviceId: serviceId(),
        assigneeId: undefined,
        includeDeleted: false,
        search: "checkout"
      },
      sort: {
        field: "createdAt",
        direction: "asc"
      }
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 23,
      totalPages: 3
    });
  });

  it("requires manage permission before listing deleted incidents", async () => {
    const useCase = new ListIncidentsUseCase(incidentRepository);

    await expect(
      useCase.execute({
        actor: viewerActor(),
        page: 1,
        pageSize: 20,
        includeDeleted: true,
        sortBy: "updatedAt",
        sortDirection: "desc"
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("loads a single incident detail for readers", async () => {
    const useCase = new GetIncidentUseCase(incidentRepository);

    const result = await useCase.execute({
      actor: viewerActor(),
      incidentId: incidentId()
    });

    expect(result.incident.id).toBe(incidentId());
    expect(result.incident.timeline).toHaveLength(0);
  });

  it("updates assigned or reported incidents and records lifecycle evidence", async () => {
    const useCase = new UpdateIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(new Date("2026-08-07T10:05:00.000Z"))
    );

    const result = await useCase.execute({
      actor: developerActor(),
      incidentId: incidentId(),
      title: "Checkout failures after deploy",
      customerImpact: "Checkout is degraded for card payments."
    });

    expect(result.incident.title).toBe("Checkout failures after deploy");
    expect(incidentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      incidentId: incidentId(),
      actorUserId: userId(),
      type: "incident_updated",
      metadata: {
        changedFields: ["title", "customerImpact"]
      }
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.updated",
        entityId: incidentId(),
        metadata: {
          changedFields: ["title", "customerImpact"]
        }
      })
    );
  });

  it("prevents developers from updating incidents they do not own or respond to", async () => {
    incidentRepository.incident = createDomainIncident({
      reporterId: otherUserId(),
      assigneeId: null
    });
    const useCase = new UpdateIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(fixedNow)
    );

    await expect(
      useCase.execute({
        actor: developerActor(),
        incidentId: incidentId(),
        title: "Unauthorized edit"
      })
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(incidentRepository.save).not.toHaveBeenCalled();
  });

  it("soft deletes incidents instead of hard deleting them", async () => {
    const useCase = new DeleteIncidentUseCase(
      incidentRepository,
      auditLog,
      new FixedClock(new Date("2026-08-07T10:10:00.000Z"))
    );

    await useCase.execute({
      actor: developerActor(),
      incidentId: incidentId()
    });

    expect(incidentRepository.incident.toSnapshot().deletedAt).toEqual(
      new Date("2026-08-07T10:10:00.000Z")
    );
    expect(incidentRepository.timelineEvents[0]?.toSnapshot()).toMatchObject({
      incidentId: incidentId(),
      type: "incident_deleted"
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "incident.deleted",
        entityId: incidentId()
      })
    );
  });
});

class FakeIncidentRepository implements IncidentRepositoryPort {
  incident = createDomainIncident();
  timelineEvents: IncidentTimelineEvent[] = [];
  referencesAvailable = true;
  listTotal = 1;

  save = vi.fn(async (incident: Incident, options: SaveIncidentOptions = {}) => {
    this.incident = incident;
    this.timelineEvents.push(...(options.timelineEvents ?? []));
  });

  findById = vi.fn(async () => this.incident);

  findDetailById = vi.fn(async (): Promise<IncidentDetailRecord | null> =>
    createIncidentDetailRecord(this.incident, this.timelineEvents)
  );

  list = vi.fn(async (): Promise<IncidentListResult> => ({
    incidents: [
      {
        incident: this.incident,
        serviceName: "Payments API",
        assigneeName: null
      }
    ],
    total: this.listTotal
  }));

  referencesExist = vi.fn(async () => this.referencesAvailable);
  activeUserExists = vi.fn(async () => true);
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

function developerActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["incidents:read", "incidents:write"],
    ...overrides
  };
}

function viewerActor(): AuthenticatedUser {
  return {
    id: otherUserId(),
    email: "viewer@plusops.dev",
    sessionId: "ce28ff9f-ed84-41bb-b67f-27410aecf6de",
    roles: ["viewer"],
    permissions: ["incidents:read"]
  };
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function otherUserId(): string {
  return "65c91c1d-9ce4-41a5-8a82-93fe93f1fdc0";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}
