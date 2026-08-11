import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import type { ServiceSnapshot } from "../domain";
import type { ServiceRepositoryPort } from "./ports";
import {
  assertCanManageHealthChecks,
  assertCanRunHealthCheck,
  assertCanViewHealth
} from "./health-permissions";

describe("health permissions", () => {
  it("allows viewers to read service health", () => {
    expect(() => assertCanViewHealth(actor(["health:view"]))).not.toThrow();
    expect(() => assertCanViewHealth(actor([]))).toThrow(ForbiddenException);
  });

  it("allows engineering managers to manage checks", () => {
    expect(() => assertCanManageHealthChecks(actor(["health:manage"]))).not.toThrow();
    expect(() => assertCanManageHealthChecks(actor(["health:run"]))).toThrow(
      ForbiddenException
    );
  });

  it("allows developers to run checks only for services owned by their team", async () => {
    const repository = serviceRepository(true);

    await expect(
      assertCanRunHealthCheck(actor(["health:run"]), service(), repository)
    ).resolves.toBeUndefined();

    expect(repository.actorBelongsToTeam).toHaveBeenCalledWith(userId(), teamId());

    await expect(
      assertCanRunHealthCheck(actor(["health:run"]), service(), serviceRepository(false))
    ).rejects.toThrow(ForbiddenException);
  });
});

function actor(permissions: string[]): AuthenticatedUser {
  return {
    id: userId(),
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions
  };
}

function serviceRepository(actorBelongsToTeam: boolean): ServiceRepositoryPort {
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

function service(): ServiceSnapshot {
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

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function now(): Date {
  return new Date("2026-08-11T10:00:00.000Z");
}
