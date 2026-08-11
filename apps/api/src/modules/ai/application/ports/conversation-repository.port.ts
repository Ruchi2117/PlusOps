import type { Conversation, ConversationMessage } from "../../domain";

export type SaveConversationInput = {
  conversation: Conversation;
  messages: ConversationMessage[];
};

export interface ConversationRepositoryPort {
  save(input: SaveConversationInput): Promise<void>;
  findById(conversationId: string): Promise<Conversation | null>;
  listMessages(conversationId: string): Promise<ConversationMessage[]>;
}
