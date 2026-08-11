import { Inject, Injectable } from "@nestjs/common";
import type { AIOperationResponse, AIPlaygroundRequest } from "@plusops/contracts";

import { assertCanUseAI, type AIActor } from "../ai-permissions";
import { AIRequestPipeline } from "../ai-request-pipeline";

export type RunAIPlaygroundCommand = AIPlaygroundRequest & {
  actor: AIActor;
};

@Injectable()
export class RunAIPlaygroundUseCase {
  constructor(@Inject(AIRequestPipeline) private readonly pipeline: AIRequestPipeline) {}

  async execute(command: RunAIPlaygroundCommand): Promise<AIOperationResponse> {
    assertCanUseAI(command.actor);

    return this.pipeline.execute({
      actorUserId: command.actor.id,
      feature: "playground",
      provider: command.provider,
      input: command.userPrompt,
      variables: command.variables,
      context: toPipelineContext(command.context),
      directPrompt: {
        systemPrompt: command.systemPrompt,
        userPrompt: renderPlaygroundPrompt(command.userPrompt, command.variables)
      }
    });
  }
}

function toPipelineContext(
  context: RunAIPlaygroundCommand["context"]
): Record<string, unknown> | undefined {
  return context ? { ...context, ...(context.metadata ?? {}) } : undefined;
}

function renderPlaygroundPrompt(prompt: string, variables: Record<string, unknown> = {}): string {
  return prompt.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
