import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { extractMentionHandles, IncidentMention } from "../../domain";
import type { IncidentMentionRepositoryPort } from "../ports";

export async function buildMentionsForComment(input: {
  body: string;
  incidentId: string;
  commentId: string;
  mentionRepository: IncidentMentionRepositoryPort;
  createdAt: Date;
}): Promise<IncidentMention[]> {
  const handles = extractMentionHandles(input.body);

  if (handles.length === 0) {
    return [];
  }

  const users = await input.mentionRepository.findMentionableUsersByHandles(handles);
  const mentions = new Map<string, IncidentMention>();

  handles.forEach((handle) => {
    const user = users.find((candidate) => candidate.handles.includes(handle));

    if (!user) {
      throw new BadRequestException(`Mentioned user could not be found: @${handle}.`);
    }

    if (!mentions.has(user.id)) {
      mentions.set(
        user.id,
        IncidentMention.create({
          id: randomUUID(),
          incidentId: input.incidentId,
          commentId: input.commentId,
          mentionedUserId: user.id,
          handle,
          createdAt: input.createdAt
        })
      );
    }
  });

  return Array.from(mentions.values());
}
