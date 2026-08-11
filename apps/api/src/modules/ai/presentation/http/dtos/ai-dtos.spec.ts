import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import {
  AIChatDto,
  AIDocsDto,
  AIPlaygroundDto,
  AIReleaseNotesDto,
  AISqlDto,
  AIToolDto,
  UpdateAIProviderDto
} from "./index";

describe("AI HTTP DTOs", () => {
  it("validates chat and engineering tool payloads", async () => {
    const chat = plainToInstance(AIChatDto, {
      provider: "openai",
      message: "Explain this incident.",
      context: { environment: "production", tags: ["incident"] }
    });
    const tool = plainToInstance(AIToolDto, {
      input: "ERROR database timeout",
      variables: { service: "Payments API" }
    });

    await expect(validate(chat)).resolves.toHaveLength(0);
    await expect(validate(tool)).resolves.toHaveLength(0);
  });

  it("validates SQL, docs, release notes, playground, and provider updates", async () => {
    const sql = plainToInstance(AISqlDto, {
      input: "List active users",
      dialect: "postgresql",
      schemaHint: "users(id uuid, active boolean)"
    });
    const docs = plainToInstance(AIDocsDto, {
      input: "GET /incidents",
      apiName: "Incidents API",
      format: "markdown"
    });
    const releaseNotes = plainToInstance(AIReleaseNotesDto, {
      version: "v0.9.0",
      changes: ["Added provider abstraction"]
    });
    const playground = plainToInstance(AIPlaygroundDto, {
      systemPrompt: "You are PlusOps.",
      userPrompt: "Hello {{name}}",
      variables: { name: "Ruchi" }
    });
    const providerUpdate = plainToInstance(UpdateAIProviderDto, {
      priority: "20",
      temperature: "0.4"
    });

    await expect(validate(sql)).resolves.toHaveLength(0);
    await expect(validate(docs)).resolves.toHaveLength(0);
    await expect(validate(releaseNotes)).resolves.toHaveLength(0);
    await expect(validate(playground)).resolves.toHaveLength(0);
    await expect(validate(providerUpdate)).resolves.toHaveLength(0);
    expect(providerUpdate.priority).toBe(20);
    expect(providerUpdate.temperature).toBe(0.4);
  });

  it("rejects invalid provider and empty release notes", async () => {
    const chat = plainToInstance(AIChatDto, {
      provider: "watson",
      message: ""
    });
    const releaseNotes = plainToInstance(AIReleaseNotesDto, {
      version: "v0.9.0",
      changes: []
    });

    expect((await validate(chat)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["provider", "message"])
    );
    expect((await validate(releaseNotes)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["changes"])
    );
  });
});
