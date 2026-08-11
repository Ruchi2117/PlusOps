import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "../../auth/presentation/http/authenticated-user";
import {
  assertCanEvaluateAlerts,
  assertCanManageAlerts,
  assertCanViewAlerts
} from "./alert-permissions";

describe("alert permissions", () => {
  it("allows viewers to read alerts only", () => {
    expect(() => assertCanViewAlerts(actor(["alerts:view"]))).not.toThrow();
    expect(() => assertCanEvaluateAlerts(actor(["alerts:view"]))).toThrow(ForbiddenException);
    expect(() => assertCanManageAlerts(actor(["alerts:view"]))).toThrow(ForbiddenException);
  });

  it("allows developers to evaluate alerts", () => {
    expect(() => assertCanEvaluateAlerts(actor(["alerts:evaluate"]))).not.toThrow();
  });

  it("allows managers to manage and evaluate alerts", () => {
    expect(() => assertCanManageAlerts(actor(["alerts:manage"]))).not.toThrow();
    expect(() => assertCanEvaluateAlerts(actor(["alerts:manage"]))).not.toThrow();
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
