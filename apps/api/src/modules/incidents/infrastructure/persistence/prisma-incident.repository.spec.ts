import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import { Incident, IncidentTimelineEvent } from "../../domain";
import { PrismaIncidentRepository } from "./prisma-incident.repository";

describe("PrismaIncidentRepository", () => {
  it("saves incidents and timeline events inside one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaIncidentRepository(prisma as unknown as PrismaService);
    const incident = createDomainIncident();
    const timelineEvent = IncidentTimelineEvent.create({
      id: "30b05cfb-cadc-4195-b960-bd68d065eb26",
      incidentId: incidentId(),
      actorUserId: userId(),
      type: "incident_created",
      message: "Incident created.",
      metadata: {
        severity: "sev2"
      },
      createdAt: now()
    });

    await repository.save(incident, { timelineEvents: [timelineEvent] });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.incident.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: incidentId() },
        update: expect.objectContaining({
          severity: "SEV2",
          priority: "HIGH",
          status: "OPEN"
        })
      })
    );
    expect(prisma.incidentTimelineEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          incidentId: incidentId(),
          actorUserId: userId(),
          type: "incident_created",
          message: "Incident created."
        })
      ]
    });
  });

  it("applies pagination, filtering, sorting, and active-record filtering", async () => {
    const prisma = createPrismaMock();
    prisma.incident.findMany.mockResolvedValueOnce([prismaIncidentSummary()]);
    prisma.incident.count.mockResolvedValueOnce(23);
    const repository = new PrismaIncidentRepository(prisma as unknown as PrismaService);

    const result = await repository.list({
      page: 2,
      pageSize: 10,
      filters: {
        status: "open",
        severity: "sev2",
        priority: "high",
        serviceId: serviceId(),
        search: "checkout",
        includeDeleted: false
      },
      sort: {
        field: "createdAt",
        direction: "asc"
      }
    });

    expect(prisma.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: "OPEN",
          severity: "SEV2",
          priority: "HIGH",
          serviceId: serviceId()
        }),
        orderBy: { createdAt: "asc" },
        skip: 10,
        take: 10
      })
    );
    expect(result.total).toBe(23);
    expect(result.incidents[0]?.incident.toSnapshot()).toMatchObject({
      id: incidentId(),
      status: "open",
      severity: "sev2",
      priority: "high"
    });
  });

  it("does not add deletedAt filtering when includeDeleted is requested", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaIncidentRepository(prisma as unknown as PrismaService);

    await repository.list({
      page: 1,
      pageSize: 20,
      filters: {
        includeDeleted: true
      },
      sort: {
        field: "updatedAt",
        direction: "desc"
      }
    });

    expect(prisma.incident.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {}
      })
    );
  });

  it("checks service and reporter references before creation", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaIncidentRepository(prisma as unknown as PrismaService);

    await expect(
      repository.referencesExist({
        serviceId: serviceId(),
        reporterId: userId()
      })
    ).resolves.toBe(true);

    expect(prisma.service.findFirst).toHaveBeenCalledWith({
      where: {
        id: serviceId(),
        deletedAt: null
      },
      select: { id: true }
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: userId(),
        deletedAt: null,
        isActive: true
      },
      select: { id: true }
    });
  });
});

function createPrismaMock() {
  const prisma = {
    incident: {
      upsert: vi.fn(async () => undefined),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => [prismaIncidentSummary()]),
      count: vi.fn(async () => 1)
    },
    incidentTimelineEvent: {
      createMany: vi.fn(async () => undefined)
    },
    service: {
      findFirst: vi.fn(async () => ({ id: serviceId() }))
    },
    user: {
      findFirst: vi.fn(async () => ({ id: userId() }))
    },
    $transaction: vi.fn(async (operation: unknown) => {
      if (Array.isArray(operation)) {
        return Promise.all(operation);
      }

      if (typeof operation === "function") {
        return operation(prisma);
      }

      throw new Error("Unsupported Prisma transaction test input.");
    })
  };

  return prisma;
}

function createDomainIncident(): Incident {
  return Incident.restore({
    id: incidentId(),
    title: "Checkout authorization failures",
    description: "Authorization requests are timing out.",
    serviceId: serviceId(),
    reporterId: userId(),
    assigneeId: null,
    severity: "sev2",
    priority: "high",
    status: "open",
    customerImpact: "Some customers cannot complete checkout.",
    startedAt: now(),
    resolvedAt: null,
    closedAt: null,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null
  });
}

function prismaIncidentSummary() {
  return {
    id: incidentId(),
    title: "Checkout authorization failures",
    description: "Authorization requests are timing out.",
    serviceId: serviceId(),
    reporterId: userId(),
    assigneeId: null,
    severity: "SEV2",
    priority: "HIGH",
    status: "OPEN",
    customerImpact: "Some customers cannot complete checkout.",
    startedAt: now(),
    resolvedAt: null,
    closedAt: null,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    service: {
      name: "Payments API"
    },
    assignee: null
  };
}

function now(): Date {
  return new Date("2026-08-07T10:00:00.000Z");
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function incidentId(): string {
  return "79a7ea92-5a3e-43bb-9d5a-530c7d662a04";
}
