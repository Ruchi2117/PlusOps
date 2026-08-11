import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../../common/prisma/prisma.service";
import { Service } from "../../domain";
import { PrismaDependencyRepository } from "./prisma-dependency.repository";
import { PrismaServiceRepository } from "./prisma-service.repository";

describe("PrismaServiceRepository", () => {
  it("saves services and synchronizes environment memberships in one transaction", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaServiceRepository(prisma as unknown as PrismaService);

    await repository.save(service(), {
      environmentIds: [environmentId()]
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.service.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: serviceId() },
        update: expect.objectContaining({
          slug: "payments-api",
          lifecycleStatus: "ACTIVE",
          visibility: "INTERNAL"
        })
      })
    );
    expect(prisma.serviceEnvironment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceId: serviceId(),
          deletedAt: null,
          environmentId: { notIn: [environmentId()] }
        })
      })
    );
    expect(prisma.serviceEnvironment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serviceId_environmentId: {
            serviceId: serviceId(),
            environmentId: environmentId()
          }
        }
      })
    );
  });

  it("applies active-record filtering, pagination, search, and sorting", async () => {
    const prisma = createPrismaMock();
    prisma.service.findMany.mockResolvedValueOnce([prismaServiceSummary()]);
    prisma.service.count.mockResolvedValueOnce(12);
    const repository = new PrismaServiceRepository(prisma as unknown as PrismaService);

    const result = await repository.list({
      page: 2,
      pageSize: 5,
      filters: {
        search: "payments",
        lifecycleStatus: "active",
        visibility: "internal",
        ownerTeamId: teamId(),
        includeDeleted: false
      },
      sort: {
        field: "updatedAt",
        direction: "desc"
      }
    });

    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          ownerTeamId: teamId(),
          lifecycleStatus: "ACTIVE",
          visibility: "INTERNAL"
        }),
        orderBy: { updatedAt: "desc" },
        skip: 5,
        take: 5
      })
    );
    expect(result.total).toBe(12);
    expect(result.services[0]?.service.toSnapshot().slug).toBe("payments-api");
  });

  it("does not add deletedAt filtering when includeDeleted is requested", async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaServiceRepository(prisma as unknown as PrismaService);

    await repository.list({
      page: 1,
      pageSize: 20,
      filters: {
        includeDeleted: true
      },
      sort: {
        field: "name",
        direction: "asc"
      }
    });

    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {}
      })
    );
  });
});

describe("PrismaDependencyRepository", () => {
  it("detects dependency graph cycles before an edge is registered", async () => {
    const prisma = createPrismaMock();
    prisma.serviceDependency.findMany.mockResolvedValueOnce([
      {
        ...prismaDependencyRecord(),
        upstreamServiceId: serviceId(),
        downstreamServiceId: downstreamServiceId()
      },
      {
        ...prismaDependencyRecord(),
        id: "97ec4bda-6303-46bd-90a9-4a78ffc1320e",
        upstreamServiceId: downstreamServiceId(),
        downstreamServiceId: thirdServiceId(),
        upstreamService: {
          name: "Identity API",
          slug: "identity-api"
        },
        downstreamService: {
          name: "Notifications API",
          slug: "notifications-api"
        }
      }
    ]);
    const repository = new PrismaDependencyRepository(prisma as unknown as PrismaService);

    await expect(repository.wouldCreateCycle(thirdServiceId(), serviceId())).resolves.toBe(true);
  });

  it("maps active dependency records for a service", async () => {
    const prisma = createPrismaMock();
    prisma.serviceDependency.findMany.mockResolvedValueOnce([prismaDependencyRecord()]);
    const repository = new PrismaDependencyRepository(prisma as unknown as PrismaService);

    const dependencies = await repository.listByService(serviceId());

    expect(prisma.serviceDependency.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          OR: [{ upstreamServiceId: serviceId() }, { downstreamServiceId: serviceId() }]
        }
      })
    );
    expect(dependencies[0]).toMatchObject({
      upstreamServiceSlug: "payments-api",
      downstreamServiceSlug: "identity-api"
    });
  });
});

function createPrismaMock() {
  const prisma = {
    service: {
      upsert: vi.fn(async () => undefined),
      findFirst: vi.fn(async () => prismaServiceSummary()),
      findMany: vi.fn(async () => [prismaServiceSummary()]),
      count: vi.fn(async () => 1)
    },
    serviceEnvironment: {
      updateMany: vi.fn(async () => undefined),
      upsert: vi.fn(async () => undefined)
    },
    team: {
      findFirst: vi.fn(async () => ({ id: teamId() }))
    },
    teamMember: {
      findFirst: vi.fn(async () => ({ id: "447e9b7c-d0ca-4a15-bf89-2b8420cff1f2" }))
    },
    serviceDependency: {
      upsert: vi.fn(async () => prismaDependencyRecord()),
      findFirst: vi.fn(async () => prismaDependencyRecord()),
      findMany: vi.fn(async () => [prismaDependencyRecord()])
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

function service(): Service {
  return Service.restore({
    id: serviceId(),
    name: "Payments API",
    slug: "payments-api",
    description: null,
    ownerTeamId: teamId(),
    repositoryUrl: null,
    apiBaseUrl: null,
    documentationUrl: null,
    runbookUrl: null,
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 2,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null
  });
}

function prismaServiceSummary() {
  return {
    id: serviceId(),
    name: "Payments API",
    slug: "payments-api",
    description: null,
    ownerTeamId: teamId(),
    repositoryUrl: null,
    apiBaseUrl: null,
    documentationUrl: null,
    runbookUrl: null,
    lifecycleStatus: "ACTIVE",
    visibility: "INTERNAL",
    tier: 2,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
    ownerTeam: {
      name: "Platform"
    }
  };
}

function prismaDependencyRecord() {
  return {
    id: dependencyId(),
    upstreamServiceId: serviceId(),
    downstreamServiceId: downstreamServiceId(),
    description: "Payments API calls Identity API.",
    createdByUserId: userId(),
    createdAt: now(),
    deletedAt: null,
    upstreamService: {
      name: "Payments API",
      slug: "payments-api"
    },
    downstreamService: {
      name: "Identity API",
      slug: "identity-api"
    }
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function downstreamServiceId(): string {
  return "663c12bb-59a5-4bc2-9d31-aea5474f6d5e";
}

function thirdServiceId(): string {
  return "36645309-5c57-4457-9fdb-33b888dc393e";
}

function dependencyId(): string {
  return "48f30b50-5751-45e4-88cf-801635db95fb";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function environmentId(): string {
  return "e67bd8c4-1cb5-4070-89f9-585854cce7ac";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
