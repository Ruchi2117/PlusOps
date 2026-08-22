import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import {
  AssignIncidentUseCase,
  ChangeIncidentSeverityUseCase,
  ChangeIncidentStatusUseCase,
  CloseIncidentUseCase,
  CreateIncidentAttachmentUseCase,
  CreateIncidentCommentUseCase,
  CreateIncidentUseCase,
  DeleteIncidentAttachmentUseCase,
  DeleteIncidentCommentUseCase,
  DeleteIncidentUseCase,
  DownloadIncidentAttachmentUseCase,
  GetIncidentUseCase,
  ListIncidentAttachmentsUseCase,
  ListIncidentCommentsUseCase,
  ListIncidentTimelineUseCase,
  ListIncidentsUseCase,
  ReopenIncidentUseCase,
  ResolveIncidentUseCase,
  UpdateIncidentCommentUseCase,
  UpdateIncidentUseCase
} from "./application/use-cases";
import { PrismaIncidentAttachmentRepository } from "./infrastructure/persistence/prisma-incident-attachment.repository";
import { PrismaIncidentCommentRepository } from "./infrastructure/persistence/prisma-incident-comment.repository";
import { PrismaIncidentMentionRepository } from "./infrastructure/persistence/prisma-incident-mention.repository";
import { PrismaIncidentRepository } from "./infrastructure/persistence/prisma-incident.repository";
import { PrismaIncidentTimelineRepository } from "./infrastructure/persistence/prisma-incident-timeline.repository";
import { LocalIncidentAttachmentStorage } from "./infrastructure/storage/local-incident-attachment-storage";
import {
  INCIDENT_ATTACHMENT_REPOSITORY,
  INCIDENT_ATTACHMENT_STORAGE,
  INCIDENT_COMMENT_REPOSITORY,
  INCIDENT_MENTION_REPOSITORY,
  INCIDENT_REPOSITORY,
  INCIDENT_TIMELINE_REPOSITORY
} from "./incidents.tokens";
import { AttachmentsController } from "./presentation/http/attachments.controller";
import { CommentsController } from "./presentation/http/comments.controller";
import { IncidentsController } from "./presentation/http/incidents.controller";

const incidentUseCases = [
  AssignIncidentUseCase,
  ChangeIncidentSeverityUseCase,
  ChangeIncidentStatusUseCase,
  CloseIncidentUseCase,
  CreateIncidentAttachmentUseCase,
  CreateIncidentCommentUseCase,
  CreateIncidentUseCase,
  DeleteIncidentAttachmentUseCase,
  DeleteIncidentCommentUseCase,
  DeleteIncidentUseCase,
  DownloadIncidentAttachmentUseCase,
  GetIncidentUseCase,
  ListIncidentAttachmentsUseCase,
  ListIncidentCommentsUseCase,
  ListIncidentTimelineUseCase,
  ListIncidentsUseCase,
  ReopenIncidentUseCase,
  ResolveIncidentUseCase,
  UpdateIncidentCommentUseCase,
  UpdateIncidentUseCase
];

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [IncidentsController, CommentsController, AttachmentsController],
  providers: [
    ...incidentUseCases,
    {
      provide: INCIDENT_REPOSITORY,
      useClass: PrismaIncidentRepository
    },
    {
      provide: INCIDENT_COMMENT_REPOSITORY,
      useClass: PrismaIncidentCommentRepository
    },
    {
      provide: INCIDENT_MENTION_REPOSITORY,
      useClass: PrismaIncidentMentionRepository
    },
    {
      provide: INCIDENT_ATTACHMENT_REPOSITORY,
      useClass: PrismaIncidentAttachmentRepository
    },
    {
      provide: INCIDENT_ATTACHMENT_STORAGE,
      useClass: LocalIncidentAttachmentStorage
    },
    {
      provide: INCIDENT_TIMELINE_REPOSITORY,
      useClass: PrismaIncidentTimelineRepository
    }
  ],
  exports: [
    ...incidentUseCases,
    INCIDENT_REPOSITORY,
    INCIDENT_COMMENT_REPOSITORY,
    INCIDENT_MENTION_REPOSITORY,
    INCIDENT_ATTACHMENT_REPOSITORY,
    INCIDENT_ATTACHMENT_STORAGE,
    INCIDENT_TIMELINE_REPOSITORY
  ]
})
export class IncidentsModule {}
