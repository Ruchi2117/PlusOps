import type {
  AIOperationResponse,
  ProviderListResponse,
  UsageRecord as UsageRecordContract
} from "@plusops/contracts";

import type {
  Conversation,
  ConversationMessage,
  ProviderConfiguration,
  UsageRecord
} from "../../domain";

export function toProviderListResponse(providers: ProviderConfiguration[]): ProviderListResponse {
  return {
    data: providers.map((provider) => provider.toContract())
  };
}

export function toUsageRecord(record: UsageRecord): UsageRecordContract {
  return record.toContract();
}

export function toAIOperationResponse(input: {
  provider: ProviderConfiguration;
  conversation: Conversation | null;
  messages: ConversationMessage[];
  usage: UsageRecord;
  output: string;
  metadata: Record<string, unknown>;
}): AIOperationResponse {
  return {
    provider: input.provider.toContract(),
    conversation: input.conversation?.toContract() ?? null,
    messages: input.messages.map((message) => message.toContract()),
    usage: toUsageRecord(input.usage),
    output: input.output,
    metadata: input.metadata
  };
}
