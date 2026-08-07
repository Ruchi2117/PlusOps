import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { AssignIncidentDto } from "./assign-incident.dto";
import { ChangeIncidentSeverityDto } from "./change-incident-severity.dto";
import { ChangeIncidentStatusDto } from "./change-incident-status.dto";
import { CreateIncidentAttachmentDto } from "./create-incident-attachment.dto";
import { CreateIncidentCommentDto } from "./create-incident-comment.dto";
import { CreateIncidentDto } from "./create-incident.dto";
import { ListIncidentCollaborationQueryDto } from "./list-incident-collaboration-query.dto";
import { ListIncidentsQueryDto } from "./list-incidents-query.dto";
import { ReopenIncidentDto } from "./reopen-incident.dto";
import { ResolveIncidentDto } from "./resolve-incident.dto";
import { UpdateIncidentCommentDto } from "./update-incident-comment.dto";
import { UpdateIncidentDto } from "./update-incident.dto";

describe("Incident HTTP DTOs", () => {
  it("accepts and trims a valid create incident payload", async () => {
    const dto = plainToInstance(CreateIncidentDto, {
      title: "  Checkout authorization failures  ",
      description: "  Authorization requests are timing out.  ",
      serviceId: serviceId(),
      severity: "sev2",
      priority: "high",
      customerImpact: "  Some customers cannot complete checkout.  "
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.title).toBe("Checkout authorization failures");
    expect(dto.customerImpact).toBe("Some customers cannot complete checkout.");
  });

  it("rejects invalid create incident payloads", async () => {
    const dto = plainToInstance(CreateIncidentDto, {
      title: "No",
      serviceId: "not-a-uuid",
      severity: "sev9",
      priority: "soon"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["title", "serviceId", "severity", "priority"])
    );
  });

  it("parses includeDeleted=false as false instead of truthy", async () => {
    const dto = plainToInstance(ListIncidentsQueryDto, {
      includeDeleted: "false"
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.includeDeleted).toBe(false);
  });

  it("rejects invalid includeDeleted query values", async () => {
    const dto = plainToInstance(ListIncidentsQueryDto, {
      includeDeleted: "sometimes"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("includeDeleted");
  });

  it("rejects empty update payloads", async () => {
    const dto = plainToInstance(UpdateIncidentDto, {});

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("atLeastOneField");
  });

  it("rejects invalid update fields", async () => {
    const dto = plainToInstance(UpdateIncidentDto, {
      title: "No"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("title");
  });

  it("accepts assignment to an active user or explicit unassignment", async () => {
    const assignDto = plainToInstance(AssignIncidentDto, {
      assigneeId: userId()
    });
    const unassignDto = plainToInstance(AssignIncidentDto, {
      assigneeId: null
    });

    await expect(validate(assignDto)).resolves.toHaveLength(0);
    await expect(validate(unassignDto)).resolves.toHaveLength(0);
  });

  it("rejects malformed assignment payloads", async () => {
    const dto = plainToInstance(AssignIncidentDto, {
      assigneeId: "not-a-uuid"
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("assigneeId");
  });

  it("validates status and severity workflow payloads", async () => {
    const statusDto = plainToInstance(ChangeIncidentStatusDto, {
      status: "investigating"
    });
    const severityDto = plainToInstance(ChangeIncidentSeverityDto, {
      severity: "sev1"
    });

    await expect(validate(statusDto)).resolves.toHaveLength(0);
    await expect(validate(severityDto)).resolves.toHaveLength(0);
  });

  it("rejects unsupported status and severity workflow values", async () => {
    const statusDto = plainToInstance(ChangeIncidentStatusDto, {
      status: "triaged"
    });
    const severityDto = plainToInstance(ChangeIncidentSeverityDto, {
      severity: "critical"
    });

    const statusErrors = await validate(statusDto);
    const severityErrors = await validate(severityDto);

    expect(statusErrors.map((error) => error.property)).toContain("status");
    expect(severityErrors.map((error) => error.property)).toContain("severity");
  });

  it("trims resolve and reopen workflow text fields", async () => {
    const resolveDto = plainToInstance(ResolveIncidentDto, {
      resolutionSummary: "  Error rates returned to baseline.  "
    });
    const reopenDto = plainToInstance(ReopenIncidentDto, {
      reason: "  Error rates increased again.  "
    });

    await expect(validate(resolveDto)).resolves.toHaveLength(0);
    await expect(validate(reopenDto)).resolves.toHaveLength(0);
    expect(resolveDto.resolutionSummary).toBe("Error rates returned to baseline.");
    expect(reopenDto.reason).toBe("Error rates increased again.");
  });

  it("rejects blank resolve and reopen workflow text fields", async () => {
    const resolveDto = plainToInstance(ResolveIncidentDto, {
      resolutionSummary: "   "
    });
    const reopenDto = plainToInstance(ReopenIncidentDto, {
      reason: "   "
    });

    const resolveErrors = await validate(resolveDto);
    const reopenErrors = await validate(reopenDto);

    expect(resolveErrors.map((error) => error.property)).toContain("resolutionSummary");
    expect(reopenErrors.map((error) => error.property)).toContain("reason");
  });

  it("trims and validates collaboration comment payloads", async () => {
    const createDto = plainToInstance(CreateIncidentCommentDto, {
      body: "  Checking logs with @alice.  "
    });
    const updateDto = plainToInstance(UpdateIncidentCommentDto, {
      body: "  Mitigation deployed.  "
    });

    await expect(validate(createDto)).resolves.toHaveLength(0);
    await expect(validate(updateDto)).resolves.toHaveLength(0);
    expect(createDto.body).toBe("Checking logs with @alice.");
    expect(updateDto.body).toBe("Mitigation deployed.");
  });

  it("rejects blank collaboration comments", async () => {
    const dto = plainToInstance(CreateIncidentCommentDto, {
      body: "   "
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("body");
  });

  it("validates attachment metadata payloads", async () => {
    const dto = plainToInstance(CreateIncidentAttachmentDto, {
      filename: "  checkout-errors.json  ",
      contentType: "  application/json  ",
      size: "2048"
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.filename).toBe("checkout-errors.json");
    expect(dto.contentType).toBe("application/json");
    expect(dto.size).toBe(2048);
  });

  it("rejects invalid attachment metadata", async () => {
    const dto = plainToInstance(CreateIncidentAttachmentDto, {
      filename: "",
      contentType: "",
      size: 0
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["filename", "contentType", "size"])
    );
  });

  it("parses collaboration includeDeleted=false as false", async () => {
    const dto = plainToInstance(ListIncidentCollaborationQueryDto, {
      page: "2",
      pageSize: "10",
      includeDeleted: "false"
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(10);
    expect(dto.includeDeleted).toBe(false);
  });
});

function serviceId(): string {
  return "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4";
}

function userId(): string {
  return "5d18e3f3-e64b-45d9-8fc8-aa1f36dcd7ff";
}
