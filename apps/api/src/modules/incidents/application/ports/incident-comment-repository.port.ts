import type { IncidentComment, IncidentMention, IncidentTimelineEvent } from "../../domain";

export type IncidentMentionRecord = {
  id: string;
  userId: string;
  displayName: string;
  handle: string;
};

export type IncidentCommentCollaborationRecord = {
  comment: IncidentComment;
  authorName: string;
  mentions: IncidentMentionRecord[];
};

export type IncidentCommentListQuery = {
  incidentId: string;
  page: number;
  pageSize: number;
  includeDeleted?: boolean;
};

export type IncidentCommentListResult = {
  comments: IncidentCommentCollaborationRecord[];
  total: number;
};

export type SaveIncidentCommentOptions = {
  mentions?: IncidentMention[];
  replaceMentions?: boolean;
  timelineEvents?: IncidentTimelineEvent[];
};

export interface IncidentCommentRepositoryPort {
  save(comment: IncidentComment, options?: SaveIncidentCommentOptions): Promise<void>;
  findById(commentId: string): Promise<IncidentCommentCollaborationRecord | null>;
  listByIncident(query: IncidentCommentListQuery): Promise<IncidentCommentListResult>;
}
