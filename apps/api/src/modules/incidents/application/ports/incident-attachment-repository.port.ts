import type { IncidentAttachment, IncidentTimelineEvent } from "../../domain";

export type IncidentAttachmentRecord = {
  attachment: IncidentAttachment;
  uploadedByName: string;
};

export type IncidentAttachmentListQuery = {
  incidentId: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
};

export type IncidentAttachmentListResult = {
  attachments: IncidentAttachmentRecord[];
  total: number;
};

export type SaveIncidentAttachmentOptions = {
  timelineEvents?: IncidentTimelineEvent[];
};

export interface IncidentAttachmentRepositoryPort {
  save(attachment: IncidentAttachment, options?: SaveIncidentAttachmentOptions): Promise<void>;
  findById(attachmentId: string): Promise<IncidentAttachmentRecord | null>;
  listByIncident(query: IncidentAttachmentListQuery): Promise<IncidentAttachmentListResult>;
}
