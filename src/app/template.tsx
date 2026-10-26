"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Pages open in place, with no slide or fade. A page that moves as it opens reads as a glitch, and a CSS transform on
 * the page would also stop fixed screens (like the sign-in screen) from covering the whole window.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
