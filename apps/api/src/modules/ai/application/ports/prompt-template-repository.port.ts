import type { AIFeature } from "@plusops/contracts";

import type { PromptTemplate } from "../../domain";

export interface PromptTemplateRepositoryPort {
  save(template: PromptTemplate): Promise<void>;
  findActiveByKey(key: string): Promise<PromptTemplate | null>;
  findDefaultForFeature(feature: AIFeature): Promise<PromptTemplate | null>;
  listActiveByFeature(feature: AIFeature): Promise<PromptTemplate[]>;
}
