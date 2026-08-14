import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import type { PointerEvent } from "react";

import { cn } from "../../lib/cn";

export type SystemFieldNodeKind =
  | "service"
  | "incident"
  | "metric"
  | "alert"
  | "ai"
  | "health"
  | "core"
  | "dependency";

export type SystemFieldNode = {
  id: string;
  label: string;
  eyebrow?: string;
  value?: string;
  detail?: string;
  meta?: string;
  href?: string;
  action?: () => void;
  icon?: LucideIcon;
  kind?: SystemFieldNodeKind;
  relatedIds?: string[];
  size?: "sm" | "md" | "lg" | "xl";
  x: number;
  y: number;
};

export type SystemFieldConnection = {
  from: string;
  to: string;
  tone?: "primary" | "danger" | "warning" | "muted";
  curve?: number;
};

type SystemFieldProps = {
  backgroundImage?: string;
  className?: string;
  connections?: SystemFieldConnection[];
  nodes: SystemFieldNode[];
  showFigure?: boolean;
  subtitle?: string;
  title?: string;
  variant?: "gate" | "sail" | "void";
};

export function SystemField({
  backgroundImage,
  className,
  connections = [],
  nodes,
  showFigure = true,
  subtitle,
  title,
  variant = "gate"
}: SystemFieldProps) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const activeNode = nodes.find((node) => node.id === activeNodeId) ?? nodes.find((node) => node.kind === "core") ?? nodes[0];
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const relatedIds = useMemo(() => {
    if (!activeNodeId) {
      return new Set<string>();
    }

    const direct = nodes.find((node) => node.id === activeNodeId)?.relatedIds ?? [];
    const connected = connections.flatMap((connection) =>
      connection.from === activeNodeId ? [connection.to] : connection.to === activeNodeId ? [connection.from] : []
    );

    return new Set([activeNodeId, ...direct, ...connected]);
  }, [activeNodeId, connections, nodes]);

  return (
    <div
      className={cn("system-field group/system-field", className)}
      data-variant={variant}
      onPointerLeave={() => setActiveNodeId(null)}
    >
      <div className="system-field__architecture" aria-hidden="true">
        {backgroundImage ? <img className="system-field__image" src={backgroundImage} alt="" loading="lazy" /> : null}
        <div className="system-field__arch" />
        <div className="system-field__plane system-field__plane--left" />
        <div className="system-field__plane system-field__plane--right" />
        <div className="system-field__floor" />
      </div>

      <svg className="system-field__paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="systemFieldPrimary" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,132,43,0)" />
            <stop offset="52%" stopColor="rgba(255,177,90,0.9)" />
            <stop offset="100%" stopColor="rgba(255,132,43,0)" />
          </linearGradient>
          <linearGradient id="systemFieldDanger" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(255,73,73,0)" />
            <stop offset="54%" stopColor="rgba(255,73,73,0.9)" />
            <stop offset="100%" stopColor="rgba(255,132,43,0)" />
          </linearGradient>
        </defs>
        {connections.map((connection) => {
          const from = nodeMap.get(connection.from);
          const to = nodeMap.get(connection.to);

          if (!from || !to) {
            return null;
          }

          const isActive =
            activeNodeId === null ||
            activeNodeId === connection.from ||
            activeNodeId === connection.to ||
            relatedIds.has(connection.from) ||
            relatedIds.has(connection.to);

          return (
            <path
              key={`${connection.from}-${connection.to}`}
              className="system-field__path"
              d={curvePath(from, to, connection.curve ?? 0.26)}
              data-active={isActive ? "true" : "false"}
              data-tone={connection.tone ?? "primary"}
            />
          );
        })}
      </svg>

      {showFigure ? <div className="system-field__figure" aria-hidden="true" /> : null}

      {title ? (
        <div className="system-field__title">
          <p className="art-eyebrow">{subtitle}</p>
          <p>{title}</p>
        </div>
      ) : null}

      <div className="system-field__nodes">
        {nodes.map((node) => {
          const nodeIsActive = activeNodeId === node.id;
          const nodeIsRelated = activeNodeId ? relatedIds.has(node.id) : true;
          const NodeIcon = node.icon;
          const content = (
            <>
              {NodeIcon ? <NodeIcon className="system-field__node-icon" aria-hidden="true" /> : null}
              <span className="system-field__node-eyebrow">{node.eyebrow}</span>
              <span className="system-field__node-label">{node.label}</span>
              {node.value ? <span className="system-field__node-value">{node.value}</span> : null}
            </>
          );
          const style = {
            left: `${node.x}%`,
            top: `${node.y}%`
          };
          const sharedProps = {
            className: "system-field__node",
            "data-active": nodeIsActive ? "true" : "false",
            "data-dimmed": activeNodeId && !nodeIsRelated ? "true" : "false",
            "data-kind": node.kind ?? "service",
            "data-size": node.size ?? "md",
            onBlur: () => setActiveNodeId(null),
            onFocus: () => setActiveNodeId(node.id),
            onPointerEnter: () => setActiveNodeId(node.id),
            onPointerMove: moveNodeTowardPointer,
            style
          };

          if (node.href) {
            return (
              <Link key={node.id} to={node.href} {...sharedProps}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={node.id}
              type="button"
              {...sharedProps}
              onClick={node.action}
            >
              {content}
            </button>
          );
        })}
      </div>

      {activeNode ? (
        <aside className="system-field__readout" aria-live="polite">
          <p className="system-field__readout-kicker">{activeNode.eyebrow ?? activeNode.kind ?? "signal"}</p>
          <h3>{activeNode.label}</h3>
          {activeNode.value ? <p className="system-field__readout-value">{activeNode.value}</p> : null}
          {activeNode.detail ? <p className="system-field__readout-detail">{activeNode.detail}</p> : null}
          {activeNode.meta ? <p className="system-field__readout-meta">{activeNode.meta}</p> : null}
        </aside>
      ) : null}
    </div>
  );
}

function curvePath(from: SystemFieldNode, to: SystemFieldNode, curve: number) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const normalX = -dy * curve;
  const normalY = dx * curve;
  const c1x = midX + normalX;
  const c1y = midY + normalY;
  const c2x = midX - normalX;
  const c2y = midY - normalY;

  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`;
}

function moveNodeTowardPointer(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const dx = (event.clientX - rect.left - rect.width / 2) / 10;
  const dy = (event.clientY - rect.top - rect.height / 2) / 10;

  event.currentTarget.style.setProperty("--node-dx", `${dx}px`);
  event.currentTarget.style.setProperty("--node-dy", `${dy}px`);
}
