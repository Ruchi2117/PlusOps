import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  IncidentCommentCollaborationRecord,
  IncidentCommentListQuery,
  IncidentCommentListResult,
  IncidentCommentRepositoryPort,
  SaveIncidentCommentOptions
} from "../../application/ports";
import { IncidentComment } from "../../domain";
import { toPrismaTimelineEventCreate } from "./incident-prisma.mappers";

@Injectable()
export class PrismaIncidentCommentRepository implements IncidentCommentRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(comment: IncidentComment, options: SaveIncidentCommentOptions = {}): Promise<void> {
    const snapshot = comment.toSnapshot();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.incidentComment.upsert({
        where: { id: snapshot.id },
        update: {
          body: snapshot.body,
          editedAt: snapshot.editedAt,
          deletedAt: snapshot.deletedAt
        },
        create: {
          id: snapshot.id,
          incidentId: snapshot.incidentId,
          authorId: snapshot.authorId,
          body: snapshot.body,
          editedAt: snapshot.editedAt,
          createdAt: snapshot.createdAt,
          deletedAt: snapshot.deletedAt
        }
      });

      if (options.replaceMentions) {
        await transaction.incidentMention.deleteMany({
          where: { commentId: snapshot.id }
        });
      }

      if (options.mentions?.length) {
        await transaction.incidentMention.createMany({
          data: options.mentions.map((mention) => {
            const mentionSnapshot = mention.toSnapshot();

            return {
              id: mentionSnapshot.id,
              incidentId: mentionSnapshot.incidentId,
              commentId: mentionSnapshot.commentId,
              mentionedUserId: mentionSnapshot.mentionedUserId,
              handle: mentionSnapshot.handle,
              createdAt: mentionSnapshot.createdAt
            };
          })
        });
      }

      if (options.timelineEvents?.length) {
        await transaction.incidentTimelineEvent.createMany({
          data: options.timelineEvents.map(toPrismaTimelineEventCreate)
        });
      }
    });
  }

  async findById(commentId: string): Promise<IncidentCommentCollaborationRecord | null> {
    const comment = await this.prisma.incidentComment.findUnique({
      where: { id: commentId },
      include: commentInclude
    });

    return comment ? mapCommentRecord(comment) : null;
  }

  async listByIncident(query: IncidentCommentListQuery): Promise<IncidentCommentListResult> {
    const where = {
      incidentId: query.incidentId,
      ...(query.includeDeleted ? {} : { deletedAt: null })
    };
    const skip = (query.page - 1) * query.pageSize;
    const [comments, total] = await this.prisma.$transaction([
      this.prisma.incidentComment.findMany({
        where,
        include: commentInclude,
        orderBy: { createdAt: "asc" },
        skip,
        take: query.pageSize
      }),
      this.prisma.incidentComment.count({ where })
    ]);

    return {
      comments: comments.map(mapCommentRecord),
      total
    };
  }
}

const commentInclude = {
  author: {
    select: {
      name: true
    }
  },
  mentions: {
    include: {
      mentionedUser: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  }
} as const;

function mapCommentRecord(comment: {
  id: string;
  incidentId: string;
  authorId: string;
  body: string;
  editedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  author: { name: string };
  mentions: Array<{
    id: string;
    mentionedUserId: string;
    handle: string;
    mentionedUser: { name: string };
  }>;
}): IncidentCommentCollaborationRecord {
  return {
    comment: IncidentComment.restore({
      id: comment.id,
      incidentId: comment.incidentId,
      authorId: comment.authorId,
      body: comment.body,
      editedAt: comment.editedAt,
      createdAt: comment.createdAt,
      deletedAt: comment.deletedAt
    }),
    authorName: comment.author.name,
    mentions: comment.mentions.map((mention) => ({
      id: mention.id,
      userId: mention.mentionedUserId,
      displayName: mention.mentionedUser.name,
      handle: mention.handle
    }))
  };
}
