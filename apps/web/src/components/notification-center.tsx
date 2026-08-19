import { Bell, CheckCircle2, X } from "lucide-react";
import { useId, useRef } from "react";
import { Link } from "react-router";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useUIStore } from "../lib/ui-store";
import { useOverlayA11y } from "../lib/use-overlay-a11y";

const notifications = [
  {
    id: "drawer-1",
    title: "Latency alert firing",
    body: "Payments API crossed the p95 threshold.",
    variant: "danger" as const
  },
  {
    id: "drawer-2",
    title: "Health recovered",
    body: "Session Service is back to healthy.",
    variant: "success" as const
  },
  {
    id: "drawer-3",
    title: "AI summary ready",
    body: "A copilot summary is available for the response team.",
    variant: "info" as const
  }
];

export function NotificationCenter() {
  const { isNotificationCenterOpen, closeNotificationCenter } = useUIStore();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useOverlayA11y({ containerRef: panelRef, initialFocusRef: closeRef, onClose: closeNotificationCenter, open: isNotificationCenterOpen });

  if (!isNotificationCenterOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        type="button"
        aria-label="Close notifications"
        onClick={closeNotificationCenter}
      />
      <aside ref={panelRef} className="absolute inset-y-3 right-3 w-[calc(100%-1.5rem)] max-w-md rounded-lg border border-white/[0.08] bg-surface/88 p-5 shadow-[0_30px_120px_rgb(0_0_0_/_0.5)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" aria-hidden="true" />
            <h2 id={titleId} className="text-lg font-bold">Notifications</h2>
          </div>
          <Button ref={closeRef} size="icon" variant="ghost" aria-label="Close notifications" onClick={closeNotificationCenter}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <article key={notification.id} className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-4 transition-all duration-200 hover:border-primary/20 hover:bg-white/[0.065]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                </div>
                <Badge variant={notification.variant}>New</Badge>
              </div>
            </article>
          ))}
        </div>
        <Button asChild className="mt-4 w-full" variant="secondary" onClick={closeNotificationCenter}>
          <Link to="/notifications">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Open inbox
          </Link>
        </Button>
      </aside>
    </div>
  );
}
