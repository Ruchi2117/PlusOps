import type { MetricAggregation, MetricLabel } from "@plusops/contracts";

import type { MetricQuery } from "../../domain";

export type MetricQueryPointRecord = {
  timestamp: Date;
  value: number;
  labels: MetricLabel[];
  source: string;
  aggregation: MetricAggregation;
  group: Record<string, string>;
  sampleCount: number;
};

export type MetricQueryResult = {
  points: MetricQueryPointRecord[];
  total: number;
  simulated: boolean;
};

export interface MetricQueryRepositoryPort {
  execute(query: MetricQuery): Promise<MetricQueryResult>;
}
