import { Bell, CheckCircle2, ShieldAlert } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { MetricCard } from "../../components/ui/metric-card";
import { PageHeader } from "../../components/ui/page-header";
import { formatDateTime } from "../../lib/format";

const notifications = [
  {
    id: "notification-1",
    title: "Payments API latency alert firing",
    body: "p95 latency crossed the configured threshold.",
    type: "alert",
    createdAt: "2026-08-12T17:04:00.000Z"
  },
  {
    id: "notification-2",
    title: "Session Service recovered",
    body: "Health checks are passing after Redis failover.",
    type: "health",
    createdAt: "2026-08-12T16:42:00.000Z"
  },
  {
    id: "notification-3",
    title: "AI summary generated",
    body: "Incident summary is ready for the response timeline.",
    type: "ai",
    createdAt: "2026-08-12T16:15:00.000Z"
  }
];

export function NotificationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" description="Operational inbox for incidents, health, alerts, and AI events." />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Notification summary">
        <MetricCard icon={Bell} label="Unread" value="3" detail="UI only" />
        <MetricCard icon={ShieldAlert} label="Alert notices" value="1" detail="critical" />
        <MetricCard icon={CheckCircle2} label="Recoveries" value="1" detail="today" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((notification) => (
            <article key={notification.id} className="ops-row p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                </div>
                <Badge variant={notification.type === "alert" ? "danger" : "info"}>{notification.type}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
