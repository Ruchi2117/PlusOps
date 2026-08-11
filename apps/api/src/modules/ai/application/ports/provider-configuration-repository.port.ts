import type { AIProvider } from "@plusops/contracts";

import type { ProviderConfiguration } from "../../domain";

export interface ProviderConfigurationRepositoryPort {
  save(configuration: ProviderConfiguration): Promise<void>;
  findById(id: string): Promise<ProviderConfiguration | null>;
  findByProvider(provider: AIProvider): Promise<ProviderConfiguration | null>;
  findDefaultEnabled(): Promise<ProviderConfiguration | null>;
  list(): Promise<ProviderConfiguration[]>;
}
