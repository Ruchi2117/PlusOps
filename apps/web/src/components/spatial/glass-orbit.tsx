import { cn } from "../../lib/cn";

type GlassOrbitProps = {
  className?: string;
};

export function GlassOrbit({ className }: GlassOrbitProps) {
  return (
    <div className={cn("glass-orbit", className)} aria-hidden="true">
      <span className="glass-orbit__halo" />
      <span className="glass-orbit__plate glass-orbit__plate--one" />
      <span className="glass-orbit__plate glass-orbit__plate--two" />
      <span className="glass-orbit__plate glass-orbit__plate--three" />
      <span className="glass-orbit__core" />
      <span className="glass-orbit__sweep" />
    </div>
  );
}
