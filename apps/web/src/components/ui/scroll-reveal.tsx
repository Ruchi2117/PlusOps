import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type ScrollRevealProps = {
  amount?: number;
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
};

export function ScrollReveal({
  amount = 0.2,
  children,
  className,
  delay = 0,
  distance = 22
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: distance }}
      transition={{
        delay,
        duration: 0.64,
        ease: [0.21, 1, 0.27, 1]
      }}
      viewport={{ amount, margin: "0px 0px -12% 0px", once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}
