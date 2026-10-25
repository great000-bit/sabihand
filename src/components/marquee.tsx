"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { TILES, type Tile } from "@/lib/tiles";

const COPIES = 3; // the row is repeated so it can loop without a gap

function Card({ t, hidden }: { t: Tile; hidden: boolean }) {
  return (
    <Link
      href={`/artisans?trade=${t.trade}`}
      aria-label={`Find ${t.label.toLowerCase()}`}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      draggable={false}
      data-card
      className="relative block aspect-[4/5] w-[170px] flex-none overflow-hidden rounded-[1.1rem] border border-white/15 bg-white/5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] [backface-visibility:hidden] sm:w-[250px]"
    >
      <Image src={t.image} alt={hidden ? "" : t.alt} fill sizes="(max-width: 640px) 170px, 250px" draggable={false} className="object-cover object-top" />
      {/* The part of the card that has passed the line turns into a black and white dot print. Clipped in code as the card moves. */}
      <span data-mono className="absolute inset-0 hidden" aria-hidden>
        <Image src={t.image} alt="" fill sizes="(max-width: 640px) 170px, 250px" draggable={false} className="object-cover object-top [filter:grayscale(1)_contrast(1.5)_brightness(1.15)]" />
        <span className="absolute inset-0 mix-blend-multiply [background-image:radial-gradient(circle_at_center,rgba(0,0,0,0.9)_0.9px,transparent_1.5px)] [background-size:3px_3px]" />
      </span>
    </Link>
  );
}

/**
 * Photos drift across a stage in 3D. Cards turn towards the centre, and the part of a card that has crossed the
 * glowing line turns into a black and white dot print. Driven by GSAP; reduced motion gets a still, flat row.
 */
export function Marquee({ speed = 55 }: { speed?: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const st = stage.current;
    const tr = track.current;
    if (!st || !tr) return;
    const cards = Array.from(tr.querySelectorAll<HTMLElement>("[data-card]"));
    const monos = cards.map((c) => c.querySelector<HTMLElement>("[data-mono]")!);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    monos.forEach((m) => m.classList.remove("hidden"));

    let loop = 0;
    let tween: gsap.core.Tween | null = null;
    const build = () => {
      tween?.kill();
      loop = tr.scrollWidth / COPIES;
      gsap.set(tr, { x: 0 });
      tween = gsap.to(tr, { x: -loop, duration: loop / speed, ease: "none", repeat: -1 });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(st);

    // Each frame: turn and clip every card according to where it is relative to the centre line.
    const tick = () => {
      const w = st.clientWidth;
      const half = w / 2;
      const x = Number(gsap.getProperty(tr, "x"));
      cards.forEach((c, i) => {
        const left = c.offsetLeft + x;
        const cw = c.offsetWidth;
        const norm = Math.max(-1.3, Math.min(1.3, (left + cw / 2 - half) / half));
        gsap.set(c, { transformPerspective: 900, rotationY: -norm * 32, z: -Math.abs(norm) * 70, scale: 1 - Math.abs(norm) * 0.06 });
        const passed = Math.max(0, Math.min(1, (half - left) / cw));
        monos[i].style.clipPath = passed <= 0 ? "inset(0 100% 0 0)" : `inset(0 ${(1 - passed) * 100}% 0 0)`;
      });
    };
    gsap.ticker.add(tick);
    tick();

    const slow = () => tween && gsap.to(tween, { timeScale: 0.15, duration: 0.5 });
    const fast = () => tween && gsap.to(tween, { timeScale: 1, duration: 0.5 });
    st.addEventListener("pointerenter", slow);
    st.addEventListener("pointerleave", fast);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      st.removeEventListener("pointerenter", slow);
      st.removeEventListener("pointerleave", fast);
      tween?.kill();
      gsap.set(tr, { clearProps: "transform" });
      cards.forEach((c) => gsap.set(c, { clearProps: "transform" }));
      monos.forEach((m) => {
        m.style.clipPath = "";
        m.classList.add("hidden");
      });
    };
  }, [speed]);

  return (
    <div ref={stage} className="relative mx-auto max-w-[1040px] overflow-hidden py-6 motion-reduce:overflow-x-auto sm:py-10 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" aria-label="Trades on Sabihand" role="region">
      <div ref={track} className="flex w-max items-center gap-3 sm:gap-4">
        {Array.from({ length: COPIES }, (_, c) => TILES.map((t) => <Card key={`${c}-${t.image}`} t={t} hidden={c > 0} />)).flat()}
      </div>
      {/* The line the photos change at. */}
      <span aria-hidden className="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-violet-500 to-transparent shadow-[0_0_10px_2px_rgba(255,120,230,0.55),0_0_36px_8px_rgba(150,90,255,0.3)] dark:via-white dark:shadow-[0_0_10px_2px_rgba(255,120,230,0.65),0_0_36px_8px_rgba(150,90,255,0.35)] motion-reduce:hidden" />
    </div>
  );
}
