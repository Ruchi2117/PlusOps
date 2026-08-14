import {
  Activity,
  Bell,
  Bot,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Search,
  Server,
  Settings,
  ShieldAlert,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";

import { CommandPalette } from "../../components/command-palette";
import { NotificationCenter } from "../../components/notification-center";
import { ThemeToggle } from "../../components/theme-toggle";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/cn";
import { useSessionStore } from "../../lib/session-store";
import { useUIStore } from "../../lib/ui-store";
import { visualAssets } from "../../lib/visual-assets";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const primaryNavigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Incidents", href: "/incidents", icon: LifeBuoy },
  { label: "Services", href: "/services", icon: Server },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "Metrics", href: "/metrics", icon: Activity },
  { label: "Alerts", href: "/alerts", icon: ShieldAlert },
  { label: "AI", href: "/ai", icon: Bot }
];

const secondaryNavigationItems: NavigationItem[] = [
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function AppShell() {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const user = useSessionStore((state) => state.user);
  const { openCommandPalette, toggleCommandPalette, openNotificationCenter } = useUIStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandKey = event.ctrlKey || event.metaKey;
      if (isCommandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCommandPalette]);

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-24 border-r border-white/[0.06] bg-black/[0.08] backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col items-center gap-8 px-3 py-6">
          <Brand compact />
          <NavigationList compact items={primaryNavigationItems} />
          <div className="mt-auto flex flex-col items-center gap-4">
            <NavigationList compact items={secondaryNavigationItems} />
            <button
              type="button"
              className="grid size-11 place-items-center rounded-lg border border-warning/20 bg-warning/10 text-warning transition-colors hover:bg-warning/15"
              aria-label="On-call status"
            >
              <Bell className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-24">
        <header className="sticky top-0 z-20 px-4 pt-4 md:px-8 lg:px-10">
          <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center justify-between border-b border-white/[0.06] bg-background/40 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
                onClick={() => setIsMobileNavigationOpen(true)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
              <button
                type="button"
                className="hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-white md:flex"
                onClick={openCommandPalette}
                aria-label="Open command palette"
                aria-keyshortcuts="Control+K Meta+K"
              >
                <Search className="size-4 text-primary/70" aria-hidden="true" />
                Search
              </button>
              <div className="min-w-0 md:hidden">
                <p className="truncate text-sm font-semibold">PlusOps</p>
                <p className="truncate text-xs text-muted-foreground">Engineering operations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="mr-2 hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
                <span className="size-1.5 rounded-full bg-primary shadow-[0_0_18px_rgb(255_132_43_/_0.72)]" />
                Production
              </div>
              <Button variant="ghost" size="icon" aria-label="Open command palette" onClick={openCommandPalette}>
                <Search className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications" onClick={openNotificationCenter}>
                <Bell className="size-4" aria-hidden="true" />
              </Button>
              <ThemeToggle />
              <NavLink
                to="/profile"
                className="hidden h-10 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 text-sm transition-colors hover:bg-white/[0.065] sm:flex"
              >
                <span className="grid size-7 place-items-center rounded-lg bg-primary/12 text-xs font-bold text-primary">
                  {(user?.name ?? "RS").slice(0, 2).toUpperCase()}
                </span>
                <span className="max-w-28 truncate">{user?.name ?? "Ruchi"}</span>
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-8 md:px-8 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>

      {isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavigationOpen(false)}
          />
          <aside className="absolute inset-y-3 left-3 w-72 rounded-lg border border-white/[0.08] bg-surface/92 px-3 py-4 shadow-panel backdrop-blur-2xl">
            <div className="flex items-center justify-between px-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavigationOpen(false)}
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="mt-6 space-y-6">
              <NavigationList items={primaryNavigationItems} onNavigate={() => setIsMobileNavigationOpen(false)} />
              <NavigationList items={secondaryNavigationItems} onNavigate={() => setIsMobileNavigationOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <CommandPalette />
      <NotificationCenter />
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 px-2", compact && "flex-col gap-2 text-center")}>
      <div className="grid size-10 place-items-center overflow-hidden rounded-lg border border-primary/25 bg-black text-primary-foreground shadow-[0_12px_40px_rgb(255_111_38_/_0.26)]">
        <img className="size-full object-cover" src={visualAssets.plusOpsLogo} alt="" aria-hidden="true" />
      </div>
      <div>
        <p className={cn("text-sm font-bold leading-5 text-white", compact && "text-[11px] leading-4")}>PlusOps</p>
        <p className={cn("text-xs font-medium text-muted-foreground", compact && "text-[9px] uppercase tracking-[0.14em]")}>
          Beta
        </p>
      </div>
    </div>
  );
}

function NavigationList({
  items,
  onNavigate,
  compact = false
}: {
  items: NavigationItem[];
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <nav className={cn("space-y-2", compact && "w-full")} aria-label="Primary navigation">
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-white/[0.055] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              compact && "h-14 flex-col justify-center gap-1 px-1 text-[10px] leading-none",
              isActive &&
                "bg-primary/10 text-white shadow-[inset_0_0_0_1px_rgb(255_132_43_/_0.2),0_0_32px_rgb(255_111_38_/_0.12)]"
            )
          }
        >
          <item.icon className="size-4 opacity-80" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
