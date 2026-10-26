"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

/** How long the sign-in screen stays up before the person is taken on. */
export const SPLASH_MS = 2900;

/**
 * The screen shown for a moment right after signing in: the logo in the middle with Google-coloured light flowing
 * through it from right to left, like coloured water. Then it moves on to `to`.
 */
export function SignInSplash({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.prefetch(to);
    const t = setTimeout(() => router.replace(to), SPLASH_MS);
    return () => clearTimeout(t);
  }, [router, to]);
  // Pages slide in with a CSS transform, which would trap a fixed screen inside the page: draw it on the body instead.
  const host = useSyncExternalStore(() => () => {}, () => document.body, () => null);
  if (!host) return null;
  return createPortal(
    <div className="splash" role="status" aria-live="polite" style={{ ["--splash-ms" as string]: `${SPLASH_MS}ms` }}>
      <div className="splash-logo" aria-hidden>
        <div className="splash-layer splash-base" />
        <div className="splash-glowwrap">
          <div className="splash-layer splash-glow" />
        </div>
        <div className="splash-layer splash-water" />
        <div className="splash-layer splash-water splash-water-2" />
      </div>
      <span className="sr-only">Signing you in</span>
    </div>,
    host,
  );
}
