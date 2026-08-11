import type { MetricLabel } from "@plusops/contracts";

import type { MetricSeries } from "../../domain";

export type FindMetricSeriesInput = {
  metricDefinitionId: string;
  labels: MetricLabel[];
  source: string;
};

export interface MetricSeriesRepositoryPort {
  save(series: MetricSeries): Promise<void>;
  findById(metricSeriesId: string): Promise<MetricSeries | null>;
  findByDefinitionLabelsAndSource(input: FindMetricSeriesInput): Promise<MetricSeries | null>;
}
