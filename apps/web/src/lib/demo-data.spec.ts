import { describe, expect, it } from "vitest";

import {
  alertListResponse,
  incidentAttachmentsResponse,
  incidentListResponse,
  metricQueryResponse,
  providerListResponse,
  serviceHealthFor,
  serviceListResponse
} from "./demo-data";

describe("demo beta data", () => {
  it("provides paginated incident data", () => {
    const response = incidentListResponse();

    expect(response.data.length).toBeGreaterThan(0);
    expect(response.pagination.total).toBe(response.data.length);
  });

  it("keeps service and health demo data linked", () => {
    const service = serviceListResponse().data[0]!;
    const health = serviceHealthFor(service.id);

    expect(health.serviceId).toBe(service.id);
  });

  it("provides metric, alert, provider, and attachment surfaces", () => {
    expect(metricQueryResponse().data.length).toBeGreaterThan(0);
    expect(alertListResponse().data.length).toBeGreaterThan(0);
    expect(providerListResponse().data.length).toBe(4);
    expect(incidentAttachmentsResponse("22222222-2222-4222-8222-222222222201").data.length).toBeGreaterThan(0);
  });
});
