import { Inject, Injectable, Logger } from "@nestjs/common";
import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { Observable } from "rxjs";
import { finalize, tap } from "rxjs";

import { MetricsService } from "./metrics.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HttpRequest");

  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    const requestId = request.header("x-request-id")?.trim() || randomUUID();
    let errorStatus: number | undefined;

    response.setHeader("x-request-id", requestId);

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          errorStatus = statusFromError(error);
        }
      }),
      finalize(() => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const statusCode = errorStatus ?? response.statusCode;
        const route = normalizedRoute(request);
        this.metrics.observeHttpRequest({
          method: request.method,
          route,
          statusCode,
          durationSeconds: durationMs / 1000
        });
        this.logger.log(
          JSON.stringify({
            event: "http_request",
            requestId,
            method: request.method,
            route,
            statusCode,
            durationMs: Number(durationMs.toFixed(2))
          })
        );
      })
    );
  }
}

function normalizedRoute(request: Request): string {
  const routePath = (request.route as { path?: string } | undefined)?.path;
  return routePath ? `${request.baseUrl}${routePath}` : "unmatched";
}

function statusFromError(error: unknown): number {
  if (error && typeof error === "object" && "getStatus" in error) {
    const getStatus = (error as { getStatus?: unknown }).getStatus;
    if (typeof getStatus === "function") {
      return Number(getStatus.call(error));
    }
  }
  return 500;
}
