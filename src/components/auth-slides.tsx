"use client";

import Image from "next/image";
import { motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import { useEffect, useState } from "react";
import { AUTH_SLIDES, SLIDE_SECONDS } from "@/lib/auth-slides";

const EASE = [0.77, 0, 0.18, 1] as const;

/** How each new picture arrives. They take turns, so no two changes in a row look the same. */
const ENTRIES: { initial: TargetAndTransition; animate: TargetAndTransition; duration: number }[] = [
  { initial: { clipPath: "inset(0 100% 0 0)" }, animate: { clipPath: "inset(0 0% 0 0)" }, duration: 0.9 }, // wipe from the left
  { initial: { scale: 1.4, opacity: 0, filter: "blur(14px)" }, animate: { scale: 1, opacity: 1, filter: "blur(0px)" }, duration: 1.1 }, // zoom out of a blur
  { initial: { clipPath: "circle(0% at 78% 22%)" }, animate: { clipPath: "circle(150% at 78% 22%)" }, duration: 1.1 }, // circle opening from the corner
  { initial: { y: "100%" }, animate: { y: "0%" }, duration: 0.9 }, // rise from the bottom
  { initial: { clipPath: "inset(100% 0 0 0)", scale: 1.15 }, animate: { clipPath: "inset(0% 0 0 0)", scale: 1 }, duration: 1 }, // reveal upwards
];

function Photo({ index }: { index: number }) {
  const s = AUTH_SLIDES[index];
  return <Image src={s.src} alt={s.alt} fill sizes="(max-width: 768px) 0px, 560px" priority={index === 0} className="object-cover" style={{ objectPosition: s.position ?? "center" }} />;
}

/** The picture panel for the sign-in pages: the photos change every few seconds with a different animation each time. */
export function AuthSlides() {
  const reduce = useReducedMotion();
  const many = AUTH_SLIDES.length > 1;
  const [st, setSt] = useState({ cur: 0, prev: null as number | null, tick: 0 });

  useEffect(() => {
    if (!many) return;
    const id = setInterval(() => setSt((s) => ({ cur: (s.cur + 1) % AUTH_SLIDES.length, prev: s.cur, tick: s.tick + 1 })), SLIDE_SECONDS * 1000);
    return () => clearInterval(id);
  }, [many]);

  const entry = ENTRIES[st.tick % ENTRIES.length];
  return (
    <div className="relative hidden min-h-[34rem] overflow-hidden bg-black md:block">
      {st.prev !== null && (
        <div className="absolute inset-0">
          <Photo index={st.prev} />
        </div>
      )}
      <motion.div
        key={st.tick}
        className="absolute inset-0"
        initial={st.tick === 0 || reduce ? false : entry.initial}
        animate={entry.animate}
        transition={{ duration: reduce ? 0 : entry.duration, ease: EASE }}
      >
        {/* A slow push in while the picture is up. */}
        <motion.div className="absolute inset-0" initial={{ scale: 1 }} animate={{ scale: reduce ? 1 : 1.08 }} transition={{ duration: SLIDE_SECONDS + 1, ease: "linear" }}>
          <Photo index={st.cur} />
        </motion.div>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 p-8 text-white">
        <p className="font-display text-3xl font-extrabold leading-tight">
          Trusted hands, <span className="text-gold">near you.</span>
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-white/85">
          <li>✓ See the price range before you book</li>
          <li>✓ Verified artisans, with the checks listed</li>
          <li>✓ Your payment is held until the job is done</li>
        </ul>
        {many && (
          <div className="mt-5 flex gap-2" aria-hidden>
            {AUTH_SLIDES.map((s, i) => (
              <span key={s.src} className="h-1 w-10 overflow-hidden rounded-full bg-white/25">
                {i === st.cur && <motion.span key={st.tick} className="block h-full bg-white" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: reduce ? 0 : SLIDE_SECONDS, ease: "linear" }} />}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
