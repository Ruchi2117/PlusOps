import type { IncidentTimelineEvent } from "../../domain";

export type IncidentTimelineListQuery = {
  incidentId: string;
  page: number;
  pageSize: number;
};

export type IncidentTimelineListResult = {
  events: IncidentTimelineEvent[];
  total: number;
};

export interface IncidentTimelineRepositoryPort {
  append(event: IncidentTimelineEvent): Promise<void>;
  listByIncident(query: IncidentTimelineListQuery): Promise<IncidentTimelineListResult>;
}
