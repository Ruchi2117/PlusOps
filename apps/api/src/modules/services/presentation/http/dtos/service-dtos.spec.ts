import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateServiceDto, ListServicesQueryDto, RegisterServiceDependencyDto } from "./index";

describe("Service HTTP DTOs", () => {
  it("accepts and normalizes a valid create service payload", async () => {
    const dto = plainToInstance(CreateServiceDto, {
      name: "  Payments API  ",
      slug: "Payments-API",
      description: "  Owns payment authorization.  ",
      ownerTeamId: teamId(),
      repositoryUrl: " https://github.com/plusops/payments-api ",
      lifecycleStatus: "active",
      visibility: "internal",
      tier: 2,
      environmentIds: [environmentId()]
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe("Payments API");
    expect(dto.slug).toBe("payments-api");
    expect(dto.description).toBe("Owns payment authorization.");
  });

  it("rejects invalid service creation payloads", async () => {
    const dto = plainToInstance(CreateServiceDto, {
      name: "P",
      slug: "Payments API!",
      ownerTeamId: "not-a-uuid",
      repositoryUrl: "not-a-url",
      lifecycleStatus: "unknown",
      tier: 7
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "name",
        "slug",
        "ownerTeamId",
        "repositoryUrl",
        "lifecycleStatus",
        "tier"
      ])
    );
  });

  it("parses includeDeleted=false as false instead of truthy", async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      includeDeleted: "false"
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.includeDeleted).toBe(false);
  });

  it("rejects invalid list filters", async () => {
    const dto = plainToInstance(ListServicesQueryDto, {
      ownerTeamId: "not-a-uuid",
      lifecycleStatus: "retired",
      includeDeleted: "sometimes",
      sortBy: "owner",
      sortDirection: "sideways"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "ownerTeamId",
        "lifecycleStatus",
        "includeDeleted",
        "sortBy",
        "sortDirection"
      ])
    );
  });

  it("validates dependency registration payloads", async () => {
    const validDto = plainToInstance(RegisterServiceDependencyDto, {
      downstreamServiceId: serviceId(),
      description: "  Payments API calls Identity API.  "
    });
    const invalidDto = plainToInstance(RegisterServiceDependencyDto, {
      downstreamServiceId: "not-a-uuid",
      description: "x".repeat(501)
    });

    await expect(validate(validDto)).resolves.toHaveLength(0);
    expect(validDto.description).toBe("Payments API calls Identity API.");

    const errors = await validate(invalidDto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["downstreamServiceId", "description"])
    );
  });
});

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function teamId(): string {
  return "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d";
}

function environmentId(): string {
  return "e67bd8c4-1cb5-4070-89f9-585854cce7ac";
}
