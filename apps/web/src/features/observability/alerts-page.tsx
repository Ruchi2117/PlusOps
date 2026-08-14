import { BellRing, Play, ShieldAlert } from "lucide-react";

import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { AlertSeverityBadge, AlertStateBadge } from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import { useAlertEvaluation, useAlerts } from "../platform/use-platform-data";

const alertPositions = [
  { x: "22%", y: "54%" },
  { x: "56%", y: "37%" },
  { x: "76%", y: "66%" },
  { x: "39%", y: "73%" }
];

export function AlertsPage() {
  const alertsQuery = useAlerts();
  const evaluateAlertMutation = useAlertEvaluation();
  const alerts = alertsQuery.data?.data ?? [];
  const firing = alerts.filter((alert) => alert.state === "firing").length;
  const pending = alerts.filter((alert) => alert.state === "pending").length;
  const primaryAlert = alerts.find((alert) => alert.state === "firing") ?? alerts[0];

  if (alertsQuery.isLoading) {
    return <Skeleton className="h-[calc(100vh-8rem)]" />;
  }

  if (alertsQuery.isError) {
    return (
      <ErrorState
        title="Alerts unavailable"
        description="Alert rules could not be loaded."
        action={<RetryButton onRetry={() => void alertsQuery.refetch()} />}
      />
    );
  }

  return (
    <div className="space-y-16">
      <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-white/[0.07] bg-black">
        <img className="absolute inset-0 h-full w-full object-cover opacity-48" src={visualAssets.redPanelCorridor} alt="" loading="lazy" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_58%,rgb(255_47_47_/_0.28),transparent_18rem),linear-gradient(90deg,rgb(0_0_0_/_0.85),rgb(0_0_0_/_0.26),rgb(0_0_0_/_0.8))]" />
        <div className="absolute left-0 top-0 h-full w-full" aria-hidden="true">
          {alerts.map((alert, index) => {
            const position = alertPositions[index] ?? alertPositions[0]!;
            return (
              <div
                key={alert.id}
                className="alert-disturbance"
                data-state={alert.state}
                style={{ left: position.x, top: position.y }}
              />
            );
          })}
        </div>

        <div className="relative z-10 flex min-h-[calc(100vh-8rem)] flex-col p-6 md:p-10 lg:p-14">
          <ScrollReveal className="max-w-4xl pt-10 md:pt-14 lg:pt-16">
            <p className="art-eyebrow">Alert command center</p>
            <h1 className="mt-6 text-[clamp(2.8rem,5vw,5.4rem)] font-black leading-[0.9] text-white">
              Alerts
              <br />
              need
              <br />
              attention.
            </h1>
          </ScrollReveal>

          <ScrollReveal className="mt-auto flex justify-end pt-12" delay={0.08}>
            <div className="max-w-xs border-t border-white/[0.14] pt-4 text-right">
              <p className="text-[clamp(3.6rem,5.4vw,5.8rem)] font-black leading-none text-white">{formatNumber(firing)}</p>
              <p className="art-eyebrow mt-2">firing alerts</p>
              <p className="mt-4 text-sm leading-6 text-white/68">{primaryAlert?.name ?? "No firing alert."}</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.72fr_1.28fr]">
        <ScrollReveal>
          <p className="art-eyebrow">Rule posture</p>
          <div className="mt-8 grid gap-5">
            <AlertSignal icon={ShieldAlert} label="Firing" value={firing} />
            <AlertSignal icon={BellRing} label="Pending" value={pending} />
            <AlertSignal icon={Play} label="Rules" value={alerts.length} />
          </div>
          <Button className="mt-8">Create alert</Button>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <p className="art-eyebrow">Alert rules</p>
          <div className="mt-6">
            {alerts.length ? (
              <div className="space-y-1">
                {alerts.map((alert, index) => (
                  <ScrollReveal key={alert.id} delay={index * 0.04} distance={16}>
                    <article className="group grid gap-5 border-b border-white/[0.08] py-6 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <AlertSeverityBadge severity={alert.severity} />
                        <AlertStateBadge state={alert.state} />
                      </div>
                      <h2 className="mt-4 text-3xl font-black leading-none text-white transition-colors group-hover:text-primary">
                        {alert.name}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {alert.description ?? "No alert description."}
                      </p>
                      <div className="mt-4 grid gap-3 text-xs text-muted-foreground md:grid-cols-4">
                        <span>Metric: {alert.condition.metricName ?? alert.condition.metricDefinitionId}</span>
                        <span>Aggregation: {titleCase(alert.condition.aggregation)}</span>
                        <span>Window: {Math.round(alert.condition.evaluationWindowSeconds / 60)} min</span>
                        <span>Updated: {formatDateTime(alert.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-start justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={evaluateAlertMutation.isPending}
                        onClick={() => evaluateAlertMutation.mutate(alert.id)}
                      >
                        <Play className="size-4" aria-hidden="true" />
                        Evaluate
                      </Button>
                    </div>
                  </article>
                  </ScrollReveal>
                ))}
              </div>
            ) : (
              <EmptyState title="No alert rules" />
            )}
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}

function AlertSignal({ icon: Icon, label, value }: { icon: typeof ShieldAlert; label: string; value: number }) {
  return (
    <div className="border-t border-white/[0.14] pt-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-4 text-6xl font-black text-white">{formatNumber(value)}</p>
      <p className="art-eyebrow mt-2">{label}</p>
    </div>
  );
}
