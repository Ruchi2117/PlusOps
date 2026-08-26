import { afterEach, describe, expect, it } from "vitest";

import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let metrics: MetricsService | undefined;

  afterEach(() => {
    metrics?.onModuleDestroy();
    metrics = undefined;
  });

  it("exports request, latency, and error metrics with normalized labels", async () => {
    metrics = new MetricsService();
    metrics.observeHttpRequest({
      method: "GET",
      route: "/api/v1/incidents/:id",
      statusCode: 503,
      durationSeconds: 0.125
    });
    metrics.observeAIRateLimit({ route: "AIController.chat", outcome: "blocked" });
    metrics.setRedisAvailability(true);

    const output = await metrics.render();

    expect(output).toContain(
      'plusops_http_requests_total{method="GET",route="/api/v1/incidents/:id",status_code="503"} 1'
    );
    expect(output).toContain(
      'plusops_http_errors_total{method="GET",route="/api/v1/incidents/:id",status_code="503"} 1'
    );
    expect(output).toContain("plusops_http_request_duration_seconds_bucket");
    expect(output).toContain(
      'plusops_ai_rate_limit_decisions_total{route="AIController.chat",outcome="blocked"} 1'
    );
    expect(output).toContain("plusops_redis_available 1");
  });
});
