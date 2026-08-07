export type CreateIncidentAttachmentStorageKeyInput = {
  incidentId: string;
  attachmentId: string;
  filename: string;
};

export interface IncidentAttachmentStoragePort {
  createStorageKey(input: CreateIncidentAttachmentStorageKeyInput): string;
}
