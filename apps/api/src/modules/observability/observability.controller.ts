import { Controller, Get, Header, Inject, Res, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Response } from "express";

import { MetricsService } from "./metrics.service";

@ApiExcludeController()
@Controller({ path: "internal", version: VERSION_NEUTRAL })
export class ObservabilityController {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  @Get("metrics")
  @Header("Cache-Control", "no-store")
  async getMetrics(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.type(this.metrics.contentType());
    return this.metrics.render();
  }
}
