import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { ConversationRepositoryPort, SaveConversationInput } from "../../application/ports";
import type { Conversation, ConversationMessage } from "../../domain";
import {
  mapConversation,
  mapConversationMessage,
  toPrismaConversationMessageCreate,
  toPrismaConversationWrite
} from "./ai-prisma.mappers";

@Injectable()
export class PrismaConversationRepository implements ConversationRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(input: SaveConversationInput): Promise<void> {
    const snapshot = input.conversation.toSnapshot();
    const data = toPrismaConversationWrite(snapshot);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.aIConversation.upsert({
        where: { id: snapshot.id },
        update: data,
        create: data
      });

      if (input.messages.length > 0) {
        await transaction.aIConversationMessage.createMany({
          data: input.messages.map((message) =>
            toPrismaConversationMessageCreate(message.toSnapshot())
          ),
          skipDuplicates: true
        });
      }
    });
  }

  async findById(conversationId: string): Promise<Conversation | null> {
    const record = await this.prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null
      }
    });
    return record ? mapConversation(record) : null;
  }

  async listMessages(conversationId: string): Promise<ConversationMessage[]> {
    const records = await this.prisma.aIConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });
    return records.map(mapConversationMessage);
  }
}
