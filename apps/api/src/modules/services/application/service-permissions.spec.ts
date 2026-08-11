import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { ServiceSnapshot } from "../domain";
import type { ServiceRepositoryPort } from "./ports";
import {
  assertCanArchiveService,
  assertCanCreateService,
  assertCanUpdateService,
  assertCanViewServices
} from "./service-permissions";

describe("Service permissions", () => {
  it("allows viewers to read service catalog entries", () => {
    expect(() => assertCanViewServices(viewerActor())).not.toThrow();
  });

  it("prevents viewers from creating services", async () => {
    await expect(
      assertCanCreateService(viewerActor(), teamId(), repository(false))
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows developers to create and update services for their team", async () => {
    const repo = repository(true);

    await expect(assertCanCreateService(developerActor(), teamId(), repo)).resolves.toBeUndefined();
    await expect(
      assertCanUpdateService(developerActor(), serviceSnapshot(), repo)
    ).resolves.toBeUndefined();
  });

  it("prevents developers from mutating services owned by another team", async () => {
    const repo = repository(false);

    await expect(
      assertCanUpdateService(developerActor(), serviceSnapshot(), repo)
    ).rejects.toThrow(ForbiddenException);
  });

  it("allows managers to manage and archive services", async () => {
    const repo = repository(false);

    await expect(
      assertCanUpdateService(managerActor(), serviceSnapshot(), repo)
    ).resolves.toBeUndefined();
    expect(() => assertCanArchiveService(managerActor())).not.toThrow();
  });
});

function repository(actorBelongsToTeam: boolean): ServiceRepositoryPort {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findDetailById: vi.fn(),
    findBySlug: vi.fn(),
    list: vi.fn(),
    ownerTeamExists: vi.fn(),
    actorBelongsToTeam: vi.fn(async () => actorBelongsToTeam)
  };
}

function viewerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "viewer@plusops.dev",
    sessionId: "ce28ff9f-ed84-41bb-b67f-27410aecf6de",
    roles: ["viewer"],
    permissions: ["service:view"]
  };
}

function developerActor(): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions: ["service:view", "service:create", "service:update"]
  };
}

function managerActor(): AuthenticatedUser {
  return {
    id: "3c30f832-ac4c-4c2e-b5c1-7f5acacb0f0f",
    email: "manager@plusops.dev",
    sessionId: "17a76105-6ff4-44f6-9786-34a97b5f9b37",
    roles: ["engineering_manager"],
    permissions: [
      "service:view",
      "service:create",
      "service:update",
      "service:archive",
      "service:manage"
    ]
  };
}

function serviceSnapshot(): ServiceSnapshot {
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
    lifecycleStatus: "active",
    visibility: "internal",
    tier: 2,
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null
  };
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
