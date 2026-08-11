import { Inject, Injectable } from "@nestjs/common";
import type { AIFeature, AIOperationResponse, AIToolRequest } from "@plusops/contracts";

import { assertCanUseEngineeringAI, type AIActor } from "../ai-permissions";
import { AIRequestPipeline } from "../ai-request-pipeline";

export type ExecuteAIToolCommand = AIToolRequest & {
  feature: Exclude<AIFeature, "chat" | "playground">;
  actor: AIActor;
};

@Injectable()
export class ExecuteAIToolUseCase {
  constructor(@Inject(AIRequestPipeline) private readonly pipeline: AIRequestPipeline) {}

  async execute(command: ExecuteAIToolCommand): Promise<AIOperationResponse> {
    assertCanUseEngineeringAI(command.actor);

    return this.pipeline.execute({
      actorUserId: command.actor.id,
      feature: command.feature,
      provider: command.provider,
      templateKey: command.templateKey,
      input: command.input,
      variables: command.variables,
      context: toPipelineContext(command.context)
    });
  }
}

function toPipelineContext(
  context: ExecuteAIToolCommand["context"]
): Record<string, unknown> | undefined {
  return context ? { ...context, ...(context.metadata ?? {}) } : undefined;
}
