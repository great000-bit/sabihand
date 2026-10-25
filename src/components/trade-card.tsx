"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Trade } from "@/lib/types";

const ICON: Record<Trade, string> = {
  plumbing: "M12 3v9m0 0a3 3 0 1 0 3 3M12 12H7",
  electrical: "M13 2 4 14h7l-1 8 9-12h-7z",
  tailoring: "M4 20 20 4M7 4l3 3m7 10 3 3M5 7a2 2 0 1 0 0 .01M17 17a2 2 0 1 0 0 .01",
  carpentry: "M3 21l9-9m0 0 3-8 6 6-8 3m-1 2-2-2",
};

export function TradeCard({ id, plural, blurb }: { id: Trade; plural: string; blurb: string }) {
  return (
    <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Link href={`/artisans?trade=${id}`} className="block h-full rounded-3xl border-2 border-line bg-white p-5 transition-colors hover:border-midnight sm:p-7">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-midnight text-gold sm:mb-5 sm:h-12 sm:w-12">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={ICON[id]} />
          </svg>
        </span>
        <p className="font-display text-xl font-extrabold sm:text-2xl">{plural}</p>
        <p className="mt-1.5 text-sm text-slate sm:text-base">{blurb}</p>
      </Link>
    </motion.div>
  );
}
