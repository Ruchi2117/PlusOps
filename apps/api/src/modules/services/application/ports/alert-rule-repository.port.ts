import type { AlertSeverity, AlertState } from "@plusops/contracts";

import type { AlertRule, AlertTimelineEvent } from "../../domain";

export type AlertRuleListFilters = {
  search?: string;
  state?: AlertState;
  severity?: AlertSeverity;
  serviceId?: string;
  includeDeleted?: boolean;
};

export type AlertRuleListQuery = {
  page: number;
  pageSize: number;
  filters?: AlertRuleListFilters;
};

export type AlertRuleListResult = {
  alerts: AlertRule[];
  total: number;
};

export type SaveAlertRuleOptions = {
  timelineEvents?: AlertTimelineEvent[];
};

export interface AlertRuleRepositoryPort {
  save(alert: AlertRule, options?: SaveAlertRuleOptions): Promise<void>;
  findById(alertRuleId: string, options?: { includeDeleted?: boolean }): Promise<AlertRule | null>;
  list(query: AlertRuleListQuery): Promise<AlertRuleListResult>;
}
