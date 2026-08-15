import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type SceneInspectorItem = {
  detail?: string;
  label: string;
  state?: "neutral" | "success" | "warning" | "danger";
  value: string;
};

export type SceneInspectorProps = {
  actions?: ReactNode;
  className?: string;
  items: SceneInspectorItem[];
  onClose?: () => void;
  subtitle?: string;
  title: string;
};

export function SceneInspector({
  actions,
  className,
  items,
  onClose,
  subtitle,
  title
}: SceneInspectorProps) {
  return (
    <aside
      aria-label={`${title} operational context`}
      className={cn("scene-inspector", className)}
      role={onClose ? "dialog" : "complementary"}
    >
      <div className="scene-inspector__header">
        <div>
          <p className="art-eyebrow">Inspector</p>
          <h2 className="scene-inspector__title">{title}</h2>
          {subtitle ? <p className="scene-inspector__subtitle">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <button
            className="scene-inspector__close"
            onClick={onClose}
            type="button"
            aria-label="Close inspector"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <dl className="scene-inspector__items">
        {items.map((item) => (
          <div
            className="scene-inspector__item"
            data-state={item.state ?? "neutral"}
            key={item.label}
          >
            <dt className="scene-inspector__item-label">{item.label}</dt>
            <dd className="scene-inspector__item-value">{item.value}</dd>
            {item.detail ? <dd className="scene-inspector__item-detail">{item.detail}</dd> : null}
          </div>
        ))}
      </dl>
      {actions ? <div className="scene-inspector__actions">{actions}</div> : null}
    </aside>
  );
}
