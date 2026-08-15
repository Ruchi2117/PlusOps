import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type MotionRevealVariant = "enter" | "fade" | "slide" | "scale";

export const opsMotion = {
  duration: {
    fast: 0.18,
    standard: 0.32,
    slow: 0.64
  },
  ease: [0.21, 1, 0.27, 1] as const
};

type MotionRevealProps = {
  amount?: number;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: MotionRevealVariant;
};

export function MotionReveal({
  amount = 0.2,
  children,
  className,
  delay = 0,
  variant = "enter"
}: MotionRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion
    ? { opacity: 1, scale: 1, x: 0, y: 0 }
    : initialByVariant(variant);

  return (
    <motion.div
      className={className}
      initial={initial}
      transition={{ delay, duration: opsMotion.duration.slow, ease: opsMotion.ease }}
      viewport={{ amount, margin: "0px 0px -10% 0px", once: true }}
      whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function initialByVariant(variant: MotionRevealVariant) {
  if (variant === "fade") {
    return { opacity: 0, scale: 1, x: 0, y: 0 };
  }

  if (variant === "scale") {
    return { opacity: 0, scale: 0.96, x: 0, y: 0 };
  }

  if (variant === "slide") {
    return { opacity: 0, scale: 1, x: 24, y: 0 };
  }

  return { opacity: 0, scale: 1, x: 0, y: 24 };
}
