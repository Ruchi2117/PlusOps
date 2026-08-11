import { Inject, Injectable } from "@nestjs/common";
import type { AIProvider } from "@plusops/contracts";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { ProviderConfigurationRepositoryPort } from "../../application/ports";
import type { ProviderConfiguration } from "../../domain";
import {
  mapProviderConfiguration,
  toPrismaProvider,
  toPrismaProviderConfigurationWrite
} from "./ai-prisma.mappers";

@Injectable()
export class PrismaProviderConfigurationRepository implements ProviderConfigurationRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(configuration: ProviderConfiguration): Promise<void> {
    const snapshot = configuration.toSnapshot();
    const data = toPrismaProviderConfigurationWrite(snapshot);

    await this.prisma.providerConfiguration.upsert({
      where: { provider: data.provider },
      update: data,
      create: {
        id: snapshot.id,
        ...data
      }
    });
  }

  async findById(id: string): Promise<ProviderConfiguration | null> {
    const record = await this.prisma.providerConfiguration.findUnique({ where: { id } });
    return record ? mapProviderConfiguration(record) : null;
  }

  async findByProvider(provider: AIProvider): Promise<ProviderConfiguration | null> {
    const record = await this.prisma.providerConfiguration.findUnique({
      where: { provider: toPrismaProvider(provider) }
    });
    return record ? mapProviderConfiguration(record) : null;
  }

  async findDefaultEnabled(): Promise<ProviderConfiguration | null> {
    const record = await this.prisma.providerConfiguration.findFirst({
      where: { isEnabled: true },
      orderBy: [{ priority: "asc" }, { provider: "asc" }]
    });
    return record ? mapProviderConfiguration(record) : null;
  }

  async list(): Promise<ProviderConfiguration[]> {
    const records = await this.prisma.providerConfiguration.findMany({
      orderBy: [{ priority: "asc" }, { provider: "asc" }]
    });
    return records.map(mapProviderConfiguration);
  }
}
