import { Inject, Injectable } from "@nestjs/common";
import type { AIChatRequest, AIOperationResponse } from "@plusops/contracts";

import { assertCanUseAI, type AIActor } from "../ai-permissions";
import { AIRequestPipeline } from "../ai-request-pipeline";

export type ChatWithAICommand = AIChatRequest & {
  actor: AIActor;
};

@Injectable()
export class ChatWithAIUseCase {
  constructor(@Inject(AIRequestPipeline) private readonly pipeline: AIRequestPipeline) {}

  async execute(command: ChatWithAICommand): Promise<AIOperationResponse> {
    assertCanUseAI(command.actor);

    return this.pipeline.execute({
      actorUserId: command.actor.id,
      feature: "chat",
      provider: command.provider,
      conversationId: command.conversationId,
      input: command.message,
      context: toPipelineContext(command.context),
      history: command.history
    });
  }
}

function toPipelineContext(
  context: ChatWithAICommand["context"]
): Record<string, unknown> | undefined {
  return context ? { ...context, ...(context.metadata ?? {}) } : undefined;
}
