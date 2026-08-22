export type CreateIncidentAttachmentStorageKeyInput = {
  incidentId: string;
  attachmentId: string;
  filename: string;
};

export interface IncidentAttachmentStoragePort {
  createStorageKey(input: CreateIncidentAttachmentStorageKeyInput): string;
  save(storageKey: string, content: Buffer): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}
