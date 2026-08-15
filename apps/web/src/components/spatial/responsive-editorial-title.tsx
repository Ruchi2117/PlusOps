import type { ElementType, ReactNode } from "react";

import { cn } from "../../lib/cn";

type ResponsiveEditorialTitleSize = "hero" | "section" | "compact";
type ResponsiveEditorialTitleWidth = "tight" | "normal" | "wide";
type ResponsiveEditorialTitleAlign = "left" | "center" | "right";

type ResponsiveEditorialTitleProps = {
  align?: ResponsiveEditorialTitleAlign;
  as?: ElementType;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  size?: ResponsiveEditorialTitleSize;
  width?: ResponsiveEditorialTitleWidth;
};

export function ResponsiveEditorialTitle({
  align = "left",
  as: Component = "h1",
  children,
  className,
  eyebrow,
  size = "hero",
  width = "normal"
}: ResponsiveEditorialTitleProps) {
  return (
    <div className={cn(align === "center" && "text-center", align === "right" && "text-right")}>
      {eyebrow ? <p className="art-eyebrow mb-4">{eyebrow}</p> : null}
      <Component
        className={cn("responsive-editorial-title", className)}
        data-align={align}
        data-size={size}
        data-width={width}
      >
        {children}
      </Component>
    </div>
  );
}
