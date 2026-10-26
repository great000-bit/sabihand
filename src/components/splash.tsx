"use client";

import { useEffect, useRef } from "react";
import { GLYPHS } from "./splash-glyphs";

/** How long the sign-in screen stays up before the person is taken on. */
export const SPLASH_MS = 2900;
/** The counter reaches 100 here; the rest is a short hold before the screen fades. */
const FILL_MS = 2500;

/**
 * The screen shown for a moment right after signing in. The logo is drawn in stroke by stroke, each letter in a
 * Google colour, then fills in solid, while a percentage counts up beneath it. Then it moves on to the place `lookup`
 * (an address that answers `{ ok, to }`) says this person goes next.
 */
export function SignInSplash({ lookup }: { lookup: string }) {
  const pct = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const first = useRef<SVGPathElement>(null);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    let left = false;
    // Ask where to go while the logo plays. If the answer cannot be had, the artisans list checks the session itself.
    let to: string | null = null;
    const go = () => {
      if (left || to == null) return;
      left = true;
      // A full page load, not an in-app navigation: the browser keeps this screen up until the next page is ready to
      // paint, so nothing half-built (a footer with no content, a loading note) can show in between.
      window.location.replace(to);
    };
    const ask = (retry: boolean): Promise<void> =>
      fetch(lookup, { cache: "no-store", credentials: "same-origin" })
        .then((r) => (r.ok ? (r.json() as Promise<{ ok: boolean; to: string }>) : Promise.reject(new Error(String(r.status)))))
        .then((r) => {
          to = r.to;
          // No session means the sign-in did not finish: there is nothing to wait for, say so now.
          if (!r.ok) go();
        })
        .catch(() => (retry ? ask(false) : void (to = "/artisans")));
    void ask(true);
    const tick = (now: number) => {
      // The letters are drawn by CSS from the first paint, which can be well before this script has loaded on a slow
      // phone. Read the time from that animation so the counter and the hand-over always agree with what is on screen.
      const anim = first.current?.getAnimations()[0];
      const started = anim?.startTime;
      const elapsed = still ? SPLASH_MS : started != null ? Number(document.timeline.currentTime ?? now) - Number(started) : now - t0;
      const p = Math.min(1, elapsed / FILL_MS);
      const eased = 1 - Math.pow(1 - p, 2.2); // quick at first, slowing near the end, like a real load
      if (pct.current) pct.current.textContent = String(Math.round(eased * 100));
      if (bar.current) bar.current.style.transform = `scaleX(${eased})`;
      if (elapsed >= SPLASH_MS) go();
      if (!left) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lookup]);

  // Drawn with the page itself (not after scripts load), so the page behind is never seen. It stays fully opaque
  // until the next page has replaced this one.
  return (
    <div className="splash" role="status" aria-live="polite">
      <svg className="splash-logo" viewBox="-10 -810 5751.3 820" aria-hidden>
        {GLYPHS.map((g, i) => (
          <path
            key={g.n}
            ref={i === 0 ? first : undefined}
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
