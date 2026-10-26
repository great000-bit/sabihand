"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { GLYPHS } from "./splash-glyphs";

/** How long the sign-in screen stays up before the person is taken on. */
export const SPLASH_MS = 2900;
/** The counter reaches 100 here; the rest is a short hold before the screen fades. */
const FILL_MS = 2500;

/**
 * The screen shown for a moment right after signing in. The logo is drawn in stroke by stroke, each letter in a
 * Google colour, then fills in solid, while a percentage counts up beneath it. Then it moves on to `to`.
 */
export function SignInSplash({ to }: { to: string }) {
  const router = useRouter();
  const pct = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    router.prefetch(to);
    const go = setTimeout(() => router.replace(to), SPLASH_MS);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = still ? 1 : Math.min(1, (now - t0) / FILL_MS);
      const eased = 1 - Math.pow(1 - p, 2.2); // quick at first, slowing near the end, like a real load
      if (pct.current) pct.current.textContent = String(Math.round(eased * 100));
      if (bar.current) bar.current.style.transform = `scaleX(${eased})`;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      clearTimeout(go);
      cancelAnimationFrame(raf);
    };
  }, [router, to]);

  // Drawn with the page itself (not after scripts load), so the page behind is never seen. It stays fully opaque
  // until the next page has replaced this one.
  return (
    <div className="splash" role="status" aria-live="polite">
      <svg className="splash-logo" viewBox="-10 -810 5751.3 820" aria-hidden>
        {GLYPHS.map((g, i) => (
          <path
            key={g.n}
            className="splash-glyph"
            d={g.d}
            transform={g.transform}
            pathLength={1}
            fillRule={g.evenodd ? "evenodd" : undefined}
            style={{ ["--i" as string]: i, ["--stroke" as string]: g.stroke, ["--fill" as string]: g.fill }}
          />
        ))}
      </svg>
      <div className="splash-count" aria-hidden>
        <span className="splash-num">
          <span ref={pct}>0</span> %
        </span>
        <span className="splash-track">
          <span ref={bar} className="splash-bar" />
        </span>
      </div>
      <span className="sr-only">Signing you in</span>
    </div>
  );
}
