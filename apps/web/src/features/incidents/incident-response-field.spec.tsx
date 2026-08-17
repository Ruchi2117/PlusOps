import type { IncidentDetail, IncidentSummary } from "@plusops/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { IncidentResponseField } from "./incident-response-field";
import {
  buildIncidentInspectorItems,
  buildIncidentResponseModel,
  getIncidentLifecycle
} from "./incident-response-model";

const now = "2026-08-15T10:30:00.000Z";
const paymentsServiceId = "11111111-1111-4111-8111-111111111111";
const checkoutServiceId = "22222222-2222-4222-8222-222222222222";
const primaryIncidentId = "33333333-3333-4333-8333-333333333333";
const relatedIncidentId = "44444444-4444-4444-8444-444444444444";
const resolvedIncidentId = "55555555-5555-4555-8555-555555555555";

describe("incident response field", () => {
  it("weights severity, active state, impact, and recency without changing incident data", () => {
    const incidents = [
      incident({
        id: primaryIncidentId,
        severity: "sev1",
        customerImpact: "Checkout requests are timing out."
      }),
      incident({ id: relatedIncidentId, severity: "sev2", title: "Payment retries elevated" }),
      incident({
        id: resolvedIncidentId,
        serviceId: checkoutServiceId,
        serviceName: "Checkout",
        severity: "sev4",
        status: "resolved",
        title: "Stale checkout cache"
      })
    ];

    const model = buildIncidentResponseModel(incidents);

    expect(model.nodes[0]).toMatchObject({
      active: true,
      glow: true,
      hasCustomerImpact: true,
      recent: true,
      severity: "critical",
      size: "lg"
    });
    expect(model.nodes[1]).toMatchObject({ active: true, severity: "warning", size: "md" });
    expect(model.nodes[2]).toMatchObject({ active: false, glow: false, size: "sm" });
    expect(model.nodes.map((node) => node.incident)).toEqual(incidents);
  });

  it("creates relationships only between incidents affecting the same service", () => {
    const model = buildIncidentResponseModel([
      incident({ id: primaryIncidentId }),
      incident({ id: relatedIncidentId, title: "Payment retries elevated" }),
      incident({
        id: resolvedIncidentId,
        serviceId: checkoutServiceId,
        serviceName: "Checkout",
        title: "Stale checkout cache"
      })
    ]);

    expect(model.arcs).toEqual([
      expect.objectContaining({ fromId: primaryIncidentId, toId: relatedIncidentId })
    ]);
  });

  it("marks the current backend lifecycle state and preserves progression", () => {
    const lifecycle = getIncidentLifecycle("mitigated");

    expect(lifecycle.find((step) => step.status === "identified")?.state).toBe("complete");
    expect(lifecycle.find((step) => step.status === "mitigated")?.state).toBe("current");
    expect(lifecycle.find((step) => step.status === "monitoring")?.state).toBe("upcoming");
  });

  it("builds inspector context from summary and selected incident detail", () => {
    const summary = incident({ id: primaryIncidentId });
    const items = buildIncidentInspectorItems(summary, detail(summary));

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Affected service", value: "Payments API" }),
        expect.objectContaining({ label: "Responder", value: "Ruchi Shaktawat" }),
        expect.objectContaining({ label: "Response activity", value: "2" })
      ])
    );
  });

  it("renders the same selected incident in the field, inspector, lifecycle, and activity", () => {
    const selectedIncident = incident({ id: primaryIncidentId });
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <IncidentResponseField
          detail={detail(selectedIncident)}
          incidents={[
            selectedIncident,
            incident({ id: relatedIncidentId, title: "Payment retries elevated" })
          ]}
          onSelect={() => undefined}
          selectedIncidentId={primaryIncidentId}
        />
      </MemoryRouter>
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Checkout latency above SLO");
    expect(markup).toContain("Lifecycle progression");
    expect(markup).toContain("Traffic shifted away from the affected region.");
    expect(markup).toContain(`/incidents/${primaryIncidentId}`);
  });
});

function incident(input: Partial<IncidentSummary> & Pick<IncidentSummary, "id">): IncidentSummary {
  return {
    id: input.id,
    title: input.title ?? "Checkout latency above SLO",
    serviceId: input.serviceId ?? paymentsServiceId,
    serviceName: input.serviceName ?? "Payments API",
    severity: input.severity ?? "sev1",
    priority: input.priority ?? "urgent",
    status: input.status ?? "investigating",
    assigneeId: input.assigneeId ?? "66666666-6666-4666-8666-666666666666",
    assigneeName: input.assigneeName ?? "Ruchi Shaktawat",
    startedAt: input.startedAt ?? now,
    updatedAt: input.updatedAt ?? now,
    customerImpact: input.customerImpact ?? "Checkout requests are timing out."
  };
}

function detail(summary: IncidentSummary): IncidentDetail {
  return {
    ...summary,
    description: "Payment authorization latency is above the service objective.",
    reporterId: "77777777-7777-4777-8777-777777777777",
    reporterName: "Engineering Manager",
    resolvedAt: null,
    closedAt: null,
    deletedAt: null,
    tags: [],
    comments: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        incidentId: summary.id,
        authorId: "66666666-6666-4666-8666-666666666666",
        authorName: "Ruchi Shaktawat",
        body: "Traffic shifted away from the affected region.",
        editedAt: null,
        createdAt: now,
        deletedAt: null,
        mentions: []
      }
    ],
    timeline: [
      {
        id: "99999999-9999-4999-8999-999999999999",
        incidentId: summary.id,
        actorUserId: "66666666-6666-4666-8666-666666666666",
        type: "status_changed",
        message: "Traffic shifted away from the affected region.",
        createdAt: now
      }
    ]
  };
}
