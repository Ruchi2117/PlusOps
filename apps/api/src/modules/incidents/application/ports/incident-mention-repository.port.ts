export type MentionableUserRecord = {
  id: string;
  displayName: string;
  handles: string[];
};

export interface IncidentMentionRepositoryPort {
  findMentionableUsersByHandles(handles: string[]): Promise<MentionableUserRecord[]>;
}
