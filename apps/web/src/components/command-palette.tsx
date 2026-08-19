import { Activity, Bell, Bot, Gauge, HeartPulse, LifeBuoy, Search, Server, ShieldAlert, UserRound } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "./ui/button";
import { Input } from "./ui/form-controls";
import { cn } from "../lib/cn";
import { useUIStore } from "../lib/ui-store";
import { useOverlayA11y } from "../lib/use-overlay-a11y";

const commands = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  { label: "Incidents", path: "/incidents", icon: LifeBuoy },
  { label: "Services", path: "/services", icon: Server },
  { label: "Health", path: "/health", icon: HeartPulse },
  { label: "Metrics", path: "/metrics", icon: Activity },
  { label: "Alerts", path: "/alerts", icon: ShieldAlert },
  { label: "AI Copilot", path: "/ai", icon: Bot },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: UserRound }
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { isCommandPaletteOpen, closeCommandPalette } = useUIStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  useOverlayA11y({ containerRef: panelRef, initialFocusRef: inputRef, onClose: closeCommandPalette, open: isCommandPaletteOpen });
  const [query, setQuery] = useState("");
  const filteredCommands = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return commands;
    }

    return commands.filter((command) => command.label.toLowerCase().includes(term));
  }, [query]);

  if (!isCommandPaletteOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close command palette"
        onClick={closeCommandPalette}
      />
      <div ref={panelRef} className="relative mx-auto mt-20 w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.08] bg-surface/88 shadow-[0_30px_120px_rgb(0_0_0_/_0.5)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_35%_0%,rgb(49_230_168_/_0.16),transparent_22rem)]" />
        <div className="relative flex items-center gap-3 border-b border-white/[0.07] p-4">
          <Search className="size-5 text-primary/75" aria-hidden="true" />
          <h2 id={titleId} className="sr-only">Workspace command palette</h2>
          <Input
            ref={inputRef}
            autoFocus
            className="h-12 border-0 bg-transparent px-0 text-base focus:ring-0"
            placeholder="Search workspace"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="relative max-h-96 overflow-y-auto p-2">
          {filteredCommands.map((command) => (
            <Button
              key={command.path}
              className={cn("h-12 w-full justify-start px-3")}
              variant="ghost"
              onClick={() => {
                navigate(command.path);
                closeCommandPalette();
                setQuery("");
              }}
            >
              <command.icon className="size-4 text-primary/70" aria-hidden="true" />
              {command.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
