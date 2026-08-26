import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy } from "@nestjs/common";
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client";

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly registry = new Registry();
  private readonly requests = new Counter({
    name: "plusops_http_requests_total",
    help: "Total HTTP requests handled by the PlusOps API.",
    labelNames: ["method", "route", "status_code"],
    registers: [this.registry]
  });
  private readonly requestDuration = new Histogram({
    name: "plusops_http_request_duration_seconds",
    help: "PlusOps API HTTP request duration in seconds.",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry]
  });
  private readonly errors = new Counter({
    name: "plusops_http_errors_total",
    help: "Total failed HTTP requests handled by the PlusOps API.",
    labelNames: ["method", "route", "status_code"],
    registers: [this.registry]
  });
  private readonly aiRateLimitDecisions = new Counter({
    name: "plusops_ai_rate_limit_decisions_total",
    help: "AI request rate-limit decisions made by PlusOps.",
    labelNames: ["route", "outcome"],
    registers: [this.registry]
  });
  private readonly redisAvailable = new Gauge({
    name: "plusops_redis_available",
    help: "Whether Redis was available during the latest observed operation or readiness probe.",
    registers: [this.registry]
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: "plusops_process_" });
  }

  observeHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationSeconds: number;
  }): void {
    const labels = {
      method: input.method,
      route: input.route,
      status_code: String(input.statusCode)
    };
    this.requests.inc(labels);
    this.requestDuration.observe(labels, input.durationSeconds);
    if (input.statusCode >= 400) {
      this.errors.inc(labels);
    }
  }

  observeAIRateLimit(input: {
    route: string;
    outcome: "allowed" | "blocked" | "fail_open";
  }): void {
    this.aiRateLimitDecisions.inc(input);
  }

  setRedisAvailability(available: boolean): void {
    this.redisAvailable.set(available ? 1 : 0);
  }

  contentType(): string {
    return this.registry.contentType;
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }

  onModuleDestroy(): void {
    this.registry.clear();
  }
}
