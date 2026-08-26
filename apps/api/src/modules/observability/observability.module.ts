import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { HttpMetricsInterceptor } from "./http-metrics.interceptor";
import { MetricsService } from "./metrics.service";
import { ObservabilityController } from "./observability.controller";

@Global()
@Module({
  controllers: [ObservabilityController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor
    }
  ],
  exports: [MetricsService]
})
export class ObservabilityModule {}
