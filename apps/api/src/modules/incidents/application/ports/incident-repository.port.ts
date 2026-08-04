import type { Incident } from "../../domain/incident.entity";

export type IncidentListQuery = {
  page: number;
  pageSize: number;
};

export type IncidentListResult = {
  incidents: Incident[];
  total: number;
};

export interface IncidentRepositoryPort {
  list(query: IncidentListQuery): Promise<IncidentListResult>;
}
