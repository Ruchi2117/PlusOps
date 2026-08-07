import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type {
  IncidentAttachmentListQuery,
  IncidentAttachmentListResult,
  IncidentAttachmentRecord,
  IncidentAttachmentRepositoryPort,
  SaveIncidentAttachmentOptions
} from "../../application/ports";
import { IncidentAttachment } from "../../domain";
import { toPrismaTimelineEventCreate } from "./incident-prisma.mappers";

@Injectable()
export class PrismaIncidentAttachmentRepository implements IncidentAttachmentRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(
    attachment: IncidentAttachment,
    options: SaveIncidentAttachmentOptions = {}
  ): Promise<void> {
    const snapshot = attachment.toSnapshot();

    await this.prisma.$transaction(async (transaction) => {
      await transaction.incidentAttachment.upsert({
        where: { id: snapshot.id },
        update: {
          deletedAt: snapshot.deletedAt
        },
        create: {
          id: snapshot.id,
          incidentId: snapshot.incidentId,
          uploadedByUserId: snapshot.uploadedByUserId,
          filename: snapshot.filename,
          contentType: snapshot.contentType,
          size: snapshot.size,
          storageKey: snapshot.storageKey,
          uploadedAt: snapshot.uploadedAt,
          deletedAt: snapshot.deletedAt
        }
      });

      if (options.timelineEvents?.length) {
        await transaction.incidentTimelineEvent.createMany({
          data: options.timelineEvents.map(toPrismaTimelineEventCreate)
        });
      }
    });
  }

  async findById(attachmentId: string): Promise<IncidentAttachmentRecord | null> {
    const attachment = await this.prisma.incidentAttachment.findUnique({
      where: { id: attachmentId },
      include: attachmentInclude
    });

    return attachment ? mapAttachmentRecord(attachment) : null;
  }

  async listByIncident(query: IncidentAttachmentListQuery): Promise<IncidentAttachmentListResult> {
    const where = {
      incidentId: query.incidentId,
      ...(query.includeDeleted ? {} : { deletedAt: null })
    };
    const skip = (query.page - 1) * query.pageSize;
    const [attachments, total] = await this.prisma.$transaction([
      this.prisma.incidentAttachment.findMany({
        where,
        include: attachmentInclude,
        orderBy: { uploadedAt: "asc" },
        skip,
        take: query.pageSize
      }),
      this.prisma.incidentAttachment.count({ where })
    ]);

    return {
      attachments: attachments.map(mapAttachmentRecord),
      total
    };
  }
}

const attachmentInclude = {
  uploadedBy: {
    select: {
      name: true
    }
  }
} as const;

function mapAttachmentRecord(attachment: {
  id: string;
  incidentId: string;
  uploadedByUserId: string;
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
  uploadedAt: Date;
  deletedAt: Date | null;
  uploadedBy: { name: string };
}): IncidentAttachmentRecord {
  return {
    attachment: IncidentAttachment.restore({
      id: attachment.id,
      incidentId: attachment.incidentId,
      uploadedByUserId: attachment.uploadedByUserId,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      storageKey: attachment.storageKey,
      uploadedAt: attachment.uploadedAt,
      deletedAt: attachment.deletedAt
    }),
    uploadedByName: attachment.uploadedBy.name
  };
}
