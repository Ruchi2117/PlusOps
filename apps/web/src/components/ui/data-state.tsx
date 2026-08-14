import { AlertCircle, Inbox, Loader2, ServerCrash } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "../../lib/cn";

type StateBlockProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: StateBlockProps) {
  return (
    <div
      className={cn(
        "grid min-h-56 place-items-center rounded-lg border border-dashed border-white/[0.1] bg-white/[0.025] p-8 text-center backdrop-blur",
        className
      )}
    >
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.05]">
          <Inbox className="size-5 text-primary/70" aria-hidden="true" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">{title}</p>
        {description ? (
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({ title, description, action, className }: StateBlockProps) {
  return (
    <div
      className={cn(
        "grid min-h-56 place-items-center rounded-lg border border-red-300/15 bg-red-500/[0.04] p-8 text-center shadow-panel backdrop-blur",
        className
      )}
    >
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-lg border border-red-300/15 bg-red-500/10">
          <ServerCrash className="size-5 text-danger" aria-hidden="true" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">{title}</p>
        {description ? (
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-300/15 bg-red-500/10 p-3 text-sm text-red-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-white/[0.07] bg-surface/70 p-8 shadow-panel backdrop-blur-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="secondary" onClick={onRetry}>
      Retry
    </Button>
  );
}
