import { Inject, Injectable } from "@nestjs/common";
import type { AIFeature } from "@plusops/contracts";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { PromptTemplateRepositoryPort } from "../../application/ports";
import type { PromptTemplate } from "../../domain";
import {
  mapPromptTemplate,
  toPrismaFeature,
  toPrismaPromptTemplateWrite
} from "./ai-prisma.mappers";

@Injectable()
export class PrismaPromptTemplateRepository implements PromptTemplateRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(template: PromptTemplate): Promise<void> {
    const snapshot = template.toSnapshot();
    const data = toPrismaPromptTemplateWrite(snapshot);

    await this.prisma.promptTemplate.upsert({
      where: {
        key_version: {
          key: snapshot.key,
          version: snapshot.version
        }
      },
      update: data,
      create: {
        id: snapshot.id,
        ...data
      }
    });
  }

  async findActiveByKey(key: string): Promise<PromptTemplate | null> {
    const record = await this.prisma.promptTemplate.findFirst({
      where: {
        key: key.trim().toLowerCase(),
        isActive: true
      },
      orderBy: { version: "desc" }
    });
    return record ? mapPromptTemplate(record) : null;
  }

  async findDefaultForFeature(feature: AIFeature): Promise<PromptTemplate | null> {
    const record = await this.prisma.promptTemplate.findFirst({
      where: {
        feature: toPrismaFeature(feature),
        isActive: true
      },
      orderBy: { version: "desc" }
    });
    return record ? mapPromptTemplate(record) : null;
  }

  async listActiveByFeature(feature: AIFeature): Promise<PromptTemplate[]> {
    const records = await this.prisma.promptTemplate.findMany({
      where: {
        feature: toPrismaFeature(feature),
        isActive: true
      },
      orderBy: [{ key: "asc" }, { version: "desc" }]
    });
    return records.map(mapPromptTemplate);
  }
}
