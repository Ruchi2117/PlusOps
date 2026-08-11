import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import {
  assertCanManagePrompts,
  assertCanManageProviders,
  assertCanUseAI,
  assertCanUseEngineeringAI
} from "./ai-permissions";

describe("AI permissions", () => {
  it("allows viewers to use basic AI only", () => {
    expect(() => assertCanUseAI(actor(["ai:use"]))).not.toThrow();
    expect(() => assertCanUseEngineeringAI(actor(["ai:use"]))).toThrow(ForbiddenException);
  });

  it("allows developers to use engineering copilots", () => {
    expect(() => assertCanUseEngineeringAI(actor(["ai:use", "ai:engineering-use"]))).not.toThrow();
  });

  it("allows managers to manage prompts but not providers", () => {
    expect(() => assertCanManagePrompts(actor(["ai:prompts-manage"]))).not.toThrow();
    expect(() => assertCanManageProviders(actor(["ai:prompts-manage"]))).toThrow(
      ForbiddenException
    );
  });
});

function actor(permissions: string[]): AuthenticatedUser {
  return {
    id: "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff",
    email: "developer@plusops.dev",
    sessionId: "8dfcbf99-1622-49d4-a375-406e9a32fb23",
    roles: ["developer"],
    permissions
  };
}
