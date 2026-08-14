import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

import { cn } from "../../lib/cn";

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.045] px-3.5 text-sm text-foreground outline-none shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] backdrop-blur transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/45 focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.045] px-3.5 text-sm text-foreground outline-none shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] backdrop-blur transition-all duration-200 focus:border-primary/45 focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full resize-y rounded-lg border border-white/[0.08] bg-white/[0.045] px-3.5 py-3 text-sm leading-6 text-foreground outline-none shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] backdrop-blur transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/45 focus:bg-white/[0.07] focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
