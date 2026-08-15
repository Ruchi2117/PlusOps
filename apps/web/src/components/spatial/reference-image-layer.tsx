import type { CSSProperties } from "react";

import { cn } from "../../lib/cn";

export type ReferenceImageMotion = "none" | "slow-drift" | "parallax";

export type ReferenceImageLayerProps = {
  alt?: string;
  className?: string;
  focalPoint?: string;
  motion?: ReferenceImageMotion;
  opacity?: number;
  scale?: number;
  src: string;
};

type ReferenceImageStyle = CSSProperties & {
  "--reference-image-opacity"?: number;
  "--reference-image-origin"?: string;
  "--reference-image-position"?: string;
  "--reference-image-scale"?: number;
};

export function ReferenceImageLayer({
  alt = "",
  className,
  focalPoint = "center",
  motion = "none",
  opacity = 0.46,
  scale = 1.04,
  src
}: ReferenceImageLayerProps) {
  const style: ReferenceImageStyle = {
    "--reference-image-opacity": opacity,
    "--reference-image-origin": focalPoint,
    "--reference-image-position": focalPoint,
    "--reference-image-scale": scale
  };

  return (
    <div className={cn("reference-image-layer", className)} data-motion={motion} style={style}>
      <img alt={alt} aria-hidden={alt ? undefined : true} loading="lazy" src={src} />
    </div>
  );
}
