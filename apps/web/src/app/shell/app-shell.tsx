import {
  Activity,
  Bell,
  Bot,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Server,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";

import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Incidents", href: "/incidents", icon: LifeBuoy },
  { label: "Services", href: "/services", icon: Server },
  { label: "APIs", href: "/apis", icon: GitBranch },
  { label: "Monitoring", href: "/monitoring", icon: Activity },
  { label: "AI Copilot", href: "/copilot", icon: Bot },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Security", href: "/security", icon: ShieldCheck }
];

export function AppShell() {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface/95 px-3 py-4 lg:block">
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-panel">
              <Gauge className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-5">PlusOps</p>
              <p className="text-xs text-muted-foreground">Production Control</p>
            </div>
          </div>

          <NavigationList />

          <div className="mt-auto rounded-md border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bell className="size-4 text-warning" aria-hidden="true" />
              On-call active
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Payments squad until 09:00 IST
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setIsMobileNavigationOpen(true)}
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
            <div>
              <p className="text-sm font-semibold">Engineering Operations</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Live operational posture across services and incidents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" aria-hidden="true" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>

      {isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-foreground/20"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavigationOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface px-3 py-4 shadow-panel">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Gauge className="size-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold">PlusOps</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavigationOpen(false)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-6">
              <NavigationList onNavigate={() => setIsMobileNavigationOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function NavigationList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Primary navigation">
      {navigationItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-muted text-foreground"
            )
          }
        >
          <item.icon className="size-4" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
