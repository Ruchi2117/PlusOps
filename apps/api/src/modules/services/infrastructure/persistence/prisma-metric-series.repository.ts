import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import type { FindMetricSeriesInput, MetricSeriesRepositoryPort } from "../../application/ports";
import { MetricLabel, type MetricSeries } from "../../domain";
import { mapMetricSeries, toPrismaMetricSeriesWrite } from "./metric-prisma.mappers";

@Injectable()
export class PrismaMetricSeriesRepository implements MetricSeriesRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService
  ) {}

  async save(series: MetricSeries): Promise<void> {
    const snapshot = series.toSnapshot();
    const data = toPrismaMetricSeriesWrite(snapshot);

    await this.prisma.metricSeries.upsert({
      where: { id: snapshot.id },
      update: data,
      create: {
        id: snapshot.id,
        ...data
      }
    });
  }

  async findById(metricSeriesId: string): Promise<MetricSeries | null> {
    const series = await this.prisma.metricSeries.findUnique({
      where: { id: metricSeriesId }
    });

    return series ? mapMetricSeries(series) : null;
  }

  async findByDefinitionLabelsAndSource(
    input: FindMetricSeriesInput
  ): Promise<MetricSeries | null> {
    const series = await this.prisma.metricSeries.findUnique({
      where: {
        metricDefinitionId_labelHash_source: {
          metricDefinitionId: input.metricDefinitionId,
          labelHash: MetricLabel.hash(input.labels),
          source: input.source.trim() || "manual"
        }
      }
    });

    return series ? mapMetricSeries(series) : null;
  }
}
