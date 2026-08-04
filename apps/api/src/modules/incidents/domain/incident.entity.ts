import type {
  IncidentListItem,
  IncidentPriority,
  IncidentSeverity,
  IncidentStatus
} from "@plusops/contracts";

export type IncidentSnapshot = {
  id: string;
  title: string;
  serviceName: string;
  severity: IncidentSeverity;
  priority: IncidentPriority;
  status: IncidentStatus;
  assigneeName: string | null;
  startedAt: Date;
  updatedAt: Date;
  customerImpact: string | null;
};

export class Incident {
  private constructor(private readonly snapshot: IncidentSnapshot) {}

  static restore(snapshot: IncidentSnapshot) {
    return new Incident(snapshot);
  }

  toListItem(): IncidentListItem {
    return {
      ...this.snapshot,
      startedAt: this.snapshot.startedAt.toISOString(),
      updatedAt: this.snapshot.updatedAt.toISOString()
    };
  }
}
