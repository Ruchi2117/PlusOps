import type { MetricRetentionPolicy } from "../../domain";

export interface MetricRetentionRepositoryPort {
  findById(retentionPolicyId: string): Promise<MetricRetentionPolicy | null>;
  findDefault(): Promise<MetricRetentionPolicy | null>;
  exists(retentionPolicyId: string): Promise<boolean>;
}
