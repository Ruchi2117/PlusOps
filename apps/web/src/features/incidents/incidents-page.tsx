import { AlertTriangle, Plus } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useDashboardSummary } from "../dashboard/use-dashboard-summary";

export function IncidentsPage() {
  const { data, isLoading } = useDashboardSummary();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Incidents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ownership, severity, timeline, and escalation</p>
        </div>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Create incident
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active response queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : data?.incidents.length ? (
            <div className="space-y-3">
              {data.incidents.map((incident) => (
                <article key={incident.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
                        <h2 className="font-medium">{incident.title}</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{incident.customerImpact}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={incident.severity === "sev1" ? "danger" : "warning"}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="info">{incident.status}</Badge>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <p className="text-sm font-medium">No incidents in the queue</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

