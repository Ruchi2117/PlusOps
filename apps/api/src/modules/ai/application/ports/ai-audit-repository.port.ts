import type { AIAuditEvent } from "../../domain";

export interface AIAuditRepositoryPort {
  save(event: AIAuditEvent): Promise<void>;
}
