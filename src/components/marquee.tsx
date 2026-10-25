"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { TILES, type Tile } from "@/lib/tiles";

function TileCard({ t }: { t: Tile }) {
  return (
    <Link
      href={`/artisans?trade=${t.trade}`}
      draggable={false}
      className={`group relative block h-44 w-32 flex-none overflow-hidden rounded-3xl bg-gradient-to-br p-2.5 transition-transform duration-300 hover:-translate-y-1.5 sm:h-72 sm:w-52 sm:p-3.5 ${t.tone}`}
    >
      <span className="relative z-10 inline-block rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm sm:px-3 sm:text-[13px]">{t.label}</span>
      {/* The photo area. Blank until an image is added in src/lib/tiles.ts. */}
      <span className="absolute inset-x-2.5 bottom-2.5 top-11 overflow-hidden rounded-2xl bg-white/20 sm:inset-x-3.5 sm:bottom-3.5 sm:top-14">
        {t.image && <Image src={t.image} alt={t.alt ?? t.label} fill sizes="(max-width: 640px) 128px, 208px" className="object-cover object-top" />}
      </span>
    </Link>
  );
}

/** A looping, hover-to-slow marquee driven by GSAP. Falls back to a plain scrollable row for reduced motion. */
export function Marquee({ speed = 60, reverse = false }: { speed?: number; reverse?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let tween: gsap.core.Tween | null = null;
    const build = () => {
      tween?.kill();
      gsap.set(el, { x: 0 });
      const half = el.scrollWidth / 2;
      const from = reverse ? -half : 0;
      const to = reverse ? 0 : -half;
      gsap.set(el, { x: from });
      tween = gsap.to(el, { x: to, duration: half / speed, ease: "none", repeat: -1 });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(el);
    const slow = () => tween && gsap.to(tween, { timeScale: 0.15, duration: 0.5 });
    const fast = () => tween && gsap.to(tween, { timeScale: 1, duration: 0.5 });
    const parent = el.parentElement!;
    parent.addEventListener("pointerenter", slow);
    parent.addEventListener("pointerleave", fast);
    return () => {
      ro.disconnect();
      parent.removeEventListener("pointerenter", slow);
      parent.removeEventListener("pointerleave", fast);
      tween?.kill();
      gsap.set(el, { clearProps: "transform" });
    };
  }, [speed, reverse]);

  return (
    <div className="overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]" aria-label="Trades on Sabihand" role="region">
      <div ref={track} className="flex w-max gap-3 sm:gap-4">
        {[...TILES, ...TILES].map((t, i) => (
          <div key={i} aria-hidden={i >= TILES.length}>
            <TileCard t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}
