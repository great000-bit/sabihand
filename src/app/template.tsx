"use client";

import { MotionConfig, motion } from "framer-motion";
import type { ReactNode } from "react";

/** Every page slides up a little as it opens. Only a vertical shift, so the content is visible before scripts run. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial={{ y: 14 }} animate={{ y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </MotionConfig>
  );
}
