import { Bell, Moon, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { FieldLabel, Select } from "../../components/ui/form-controls";
import { MetricCard } from "../../components/ui/metric-card";
import { PageHeader } from "../../components/ui/page-header";
import { useThemeStore } from "../../lib/theme-store";
import { dataMode } from "../platform/platform-api";

export function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Workspace preferences, theme, notifications, and beta controls." />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Settings summary">
        <MetricCard icon={Moon} label="Theme" value={theme} detail="local preference" />
        <MetricCard icon={Bell} label="Notifications" value="UI only" detail="center enabled" />
        <MetricCard icon={ShieldCheck} label="Security" value="RBAC" detail="backend enforced" />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="ops-row p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="mt-1 text-xs text-muted-foreground">Stored in this browser.</p>
                </div>
                <Button variant="secondary" onClick={toggleTheme}>
                  Toggle
                </Button>
              </div>
            </div>
            <label className="block space-y-1">
              <FieldLabel>Default environment</FieldLabel>
              <Select defaultValue="production">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </Select>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Beta controls</CardTitle>
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingRow title="Data source" value={dataMode === "demo" ? "Explicit demo mode" : "Live API"} />
            <SettingRow title="Silent fallback" value="Disabled" />
            <SettingRow title="Realtime notifications" value="Deferred" />
            <SettingRow title="Frontend auth pages" value="Partial" />
            <SettingRow title="Production deployment" value="Deferred" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="ops-row flex items-center justify-between gap-3 p-3 text-sm">
      <span>{title}</span>
      <span className="font-medium text-muted-foreground">{value}</span>
    </div>
  );
}
