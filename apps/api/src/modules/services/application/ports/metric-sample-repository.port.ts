import type { MetricSample } from "../../domain";

export interface MetricSampleRepositoryPort {
  save(sample: MetricSample, series: { id: string; lastSampleAt: Date }): Promise<void>;
  findLatestBySeries(metricSeriesId: string): Promise<MetricSample | null>;
}
