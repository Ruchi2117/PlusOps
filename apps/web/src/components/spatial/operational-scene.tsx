import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";
import { ReferenceImageLayer, type ReferenceImageLayerProps } from "./reference-image-layer";

type OperationalSceneTone = "default" | "calm" | "danger";
type OperationalSceneHeight = "compact" | "default" | "full";
type OperationalSceneOverlay = "soft" | "strong" | "none";

export interface OperationalSceneProps extends HTMLAttributes<HTMLElement> {
  contentClassName?: string;
  image?: ReferenceImageLayerProps;
  inspector?: ReactNode;
  overlay?: OperationalSceneOverlay;
  spatialLayer?: ReactNode;
  tone?: OperationalSceneTone;
  height?: OperationalSceneHeight;
}

export function OperationalScene({
  children,
  className,
  contentClassName,
  height = "default",
  image,
  inspector,
  overlay = "soft",
  spatialLayer,
  tone = "default",
  ...props
}: OperationalSceneProps) {
  return (
    <section
      className={cn("operational-scene", className)}
      data-height={height}
      data-overlay={overlay}
      data-tone={tone}
      {...props}
    >
      {image ? <ReferenceImageLayer {...image} /> : null}
      <div className="operational-scene__lighting" aria-hidden="true" />
      {spatialLayer ? <div className="operational-scene__spatial">{spatialLayer}</div> : null}
      <div className={cn("operational-scene__content", contentClassName)}>{children}</div>
      {inspector}
    </section>
  );
}
