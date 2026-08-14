import { KeyRound, MailCheck, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { MetricCard } from "../../components/ui/metric-card";
import { PageHeader } from "../../components/ui/page-header";
import { titleCase } from "../../lib/format";
import { useSessionStore } from "../../lib/session-store";
import { EmptyState } from "../../components/ui/data-state";
import { Button } from "../../components/ui/button";
import { useLogoutMutation } from "../platform/use-platform-data";

export function ProfilePage() {
  const user = useSessionStore((state) => state.user);
  const logoutMutation = useLogoutMutation();

  if (!user) {
    return <EmptyState title="No active profile" description="Sign in to view backend identity and RBAC data." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profile"
        description="Identity, role assignments, and permissions for this workspace."
        actions={
          <Button variant="secondary" disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>
            Sign out
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-4" aria-label="Profile summary">
        <MetricCard icon={UserRound} label="Account" value={user.name} detail={user.email} />
        <MetricCard icon={ShieldCheck} label="Roles" value={String(user.roles.length)} detail="assigned" />
        <MetricCard icon={KeyRound} label="Permissions" value={String(user.permissions.length)} detail="granted" />
        <MetricCard
          icon={MailCheck}
          label="Email"
          value={user.emailVerified ? "Verified" : "Pending"}
          detail="ownership"
          trend={user.emailVerified ? "up" : "flat"}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileRow label="Name" value={user.name} />
            <ProfileRow label="Email" value={user.email} />
            <ProfileRow label="Email status" value={user.emailVerified ? "Verified" : "Pending"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <Badge key={role} variant="info">
                    {titleCase(role)}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Permissions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user.permissions.map((permission) => (
                  <Badge key={permission} variant="neutral">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ops-row flex items-center justify-between gap-3 p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
