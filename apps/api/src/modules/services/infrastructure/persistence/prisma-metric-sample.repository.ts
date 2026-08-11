import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { MetricSampleRepositoryPort } from "../../application/ports";
import type { MetricSample } from "../../domain";
import { mapMetricSample, toPrismaMetricSampleCreate } from "./metric-prisma.mappers";

@Injectable()
export class PrismaMetricSampleRepository implements MetricSampleRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(sample: MetricSample, series: { id: string; lastSampleAt: Date }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.metricSample.create({
        data: toPrismaMetricSampleCreate(sample.toSnapshot())
      }),
      this.prisma.metricSeries.update({
        where: { id: series.id },
        data: {
          lastSampleAt: series.lastSampleAt,
          updatedAt: series.lastSampleAt
        }
      })
    ]);
  }

  async findLatestBySeries(metricSeriesId: string): Promise<MetricSample | null> {
    const sample = await this.prisma.metricSample.findFirst({
      where: { metricSeriesId },
      orderBy: { timestamp: "desc" }
    });

    return sample ? mapMetricSample(sample) : null;
  }
}
