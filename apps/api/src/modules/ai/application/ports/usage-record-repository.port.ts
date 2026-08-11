import type { UsageRecord } from "../../domain";

export interface UsageRecordRepositoryPort {
  save(record: UsageRecord): Promise<void>;
}
