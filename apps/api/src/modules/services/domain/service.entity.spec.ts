import { describe, expect, it } from "vitest";

import { ServiceDomainError } from "./service-domain.error";
import { ServiceDependency } from "./service-dependency.entity";
import { Service } from "./service.entity";

const now = new Date("2026-08-11T10:00:00.000Z");
const later = new Date("2026-08-11T10:10:00.000Z");

describe("Service", () => {
  it("creates a service with normalized metadata and catalog defaults", () => {
    const service = createService();

    expect(service.toSnapshot()).toMatchObject({
      name: "Payments API",
      slug: "payments-api",
      description: "Owns payment authorization.",
      lifecycleStatus: "active",
      visibility: "internal",
      tier: 2,
      deletedAt: null
    });
  });

  it("updates editable metadata through domain behavior", () => {
    const service = createService();

    service.update({
      description: null,
      repositoryUrl: "https://github.com/plusops/payments-api",
      visibility: "private",
      tier: 1,
      updatedAt: later
    });

    expect(service.toSnapshot()).toMatchObject({
      description: null,
      repositoryUrl: "https://github.com/plusops/payments-api",
      visibility: "private",
      tier: 1,
      updatedAt: later
    });
  });

  it("rejects invalid slugs and malformed URLs", () => {
    expect(() =>
      Service.create({
        ...baseServiceInput(),
        slug: "Payments API"
      })
    ).toThrow(ServiceDomainError);

    expect(() =>
      Service.create({
        ...baseServiceInput(),
        repositoryUrl: "not-a-url"
      })
    ).toThrow(ServiceDomainError);
  });

  it("archives services and prevents later metadata mutation", () => {
    const service = createService();

    service.archive(later);

    expect(service.toSnapshot()).toMatchObject({
      lifecycleStatus: "archived",
      deletedAt: later
    });
    expect(() =>
      service.update({
        name: "New Name",
        updatedAt: later
      })
    ).toThrow(ServiceDomainError);
  });
});

describe("ServiceDependency", () => {
  it("creates a dependency edge between two different services", () => {
    const dependency = ServiceDependency.create({
      id: dependencyId(),
      upstreamServiceId: serviceId(),
      downstreamServiceId: downstreamServiceId(),
      description: "Payments API calls Identity API.",
      createdByUserId: userId(),
      createdAt: now
    });

    expect(dependency.toSnapshot()).toMatchObject({
      upstreamServiceId: serviceId(),
      downstreamServiceId: downstreamServiceId(),
      deletedAt: null
    });
  });

  it("rejects self dependencies", () => {
    expect(() =>
      ServiceDependency.create({
        id: dependencyId(),
        upstreamServiceId: serviceId(),
        downstreamServiceId: serviceId(),
        createdAt: now
      })
    ).toThrow(ServiceDomainError);
  });

  it("soft deletes dependency edges idempotently", () => {
    const dependency = ServiceDependency.create({
      id: dependencyId(),
      upstreamServiceId: serviceId(),
      downstreamServiceId: downstreamServiceId(),
      createdAt: now
    });

    dependency.markDeleted(later);
    dependency.markDeleted(new Date("2026-08-11T10:20:00.000Z"));

    expect(dependency.toSnapshot().deletedAt).toEqual(later);
  });
});

function createService(): Service {
  return Service.create(baseServiceInput());
}

function baseServiceInput() {
  return {
    id: serviceId(),
    name: "  Payments API  ",
    slug: "payments-api",
    description: "  Owns payment authorization.  ",
    ownerTeamId: teamId(),
    createdAt: now
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function downstreamServiceId(): string {
  return "663c12bb-59a5-4bc2-9d31-aea5474f6d5e";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function dependencyId(): string {
  return "48f30b50-5751-45e4-88cf-801635db95fb";
}
