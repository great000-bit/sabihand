"use client";

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion";
import type { ReactNode } from "react";

// Light shapes on purpose: they sit on a dark slot, so they show in light and dark mode.
const WHITE = "#ffffff";
const SKY = "#bcd2ff";
const GOLD = "#f6c85a";
const MINT = "#86e9b8";
const NAVY = "#0b1f4b";

type Keyframes = Record<string, (number | string)[]>;

type Ease = "easeInOut" | "easeOut" | "linear";
type LoopProps = { animate: TargetAndTransition; transition: Transition };

/** Looping animation props. With reduced motion the element rests on its second keyframe, which is always the "shown" state. */
function useLoop() {
  const reduce = useReducedMotion();
  return (frames: Keyframes, o: { dur: number; times?: number[]; delay?: number; ease?: Ease }): LoopProps => {
    if (reduce) return { animate: Object.fromEntries(Object.entries(frames).map(([k, v]) => [k, v[1]])) as TargetAndTransition, transition: { duration: 0 } };
    // Keyframe times must run from 0 to 1: hold the first value until the first time, and the last value after the last.
    let times = o.times;
    let vals = frames;
    if (times) {
      const head = times[0] > 0;
      const tail = times[times.length - 1] < 1;
      if (head || tail) {
        times = [...(head ? [0] : []), ...times, ...(tail ? [1] : [])];
        vals = Object.fromEntries(Object.entries(frames).map(([k, v]) => [k, [...(head ? [v[0]] : []), ...v, ...(tail ? [v[v.length - 1]] : [])]]));
      }
    }
    return { animate: vals as TargetAndTransition, transition: { duration: o.dur, times, delay: o.delay ?? 0, repeat: Infinity, ease: o.ease ?? "easeInOut" } };
  };
}

const center = { transformBox: "fill-box", transformOrigin: "center" } as const;
const left = { transformBox: "fill-box", transformOrigin: "left center" } as const;

function Stage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 400" className="h-full w-full" role="img" aria-label={label} fontFamily="inherit">
      <defs>
        <pattern id="mg-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" fill={WHITE} fillOpacity="0.14" />
        </pattern>
      </defs>
      <rect width="320" height="400" fill="url(#mg-dots)" />
      {children}
    </svg>
  );
}

/** Find: a pin on a map, and verified artisans appearing near it. */
export function FindGraphic() {
  const loop = useLoop();
  const D = 6;
  const T = [0, 0.1, 0.85, 1];
  const people = [
    ["Plumber", "Verified · 1.2 km away"],
    ["Electrician", "Verified · 2.0 km away"],
    ["Tailor", "Verified · 3.4 km away"],
  ];
  return (
    <Stage label="A pin on a map with verified artisans appearing nearby">
      <path d="M-10 118 C70 86 150 168 330 104" stroke={WHITE} strokeOpacity="0.16" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M70 -10 C96 80 60 150 110 230" stroke={WHITE} strokeOpacity="0.12" strokeWidth="8" fill="none" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <motion.circle key={i} cx="160" cy="150" fill="none" stroke={SKY} strokeWidth="2" initial={{ r: 10, opacity: 0.7 }} {...loop({ r: [10, 84], opacity: [0.7, 0] }, { dur: 2.4, delay: i * 0.8, ease: "easeOut" })} />
      ))}
      <motion.g {...loop({ y: [0, -7, 0] }, { dur: 1.6 })} style={center}>
        <path d="M160 116c-14 0-25 11-25 25 0 19 25 42 25 42s25-23 25-42c0-14-11-25-25-25z" fill={GOLD} />
        <circle cx="160" cy="141" r="9" fill={NAVY} />
      </motion.g>
      <text x="160" y="214" textAnchor="middle" fontSize="12" fontWeight="700" fill={SKY} letterSpacing="2">NEAR YOU</text>
      {people.map(([name, sub], i) => {
        const y = 232 + i * 52;
        return (
          <motion.g key={name} {...loop({ opacity: [0, 1, 1, 0], y: [14, 0, 0, -6] }, { dur: D, times: T, delay: i * 0.5 })}>
            <rect x="40" y={y} width="240" height="42" rx="15" fill={WHITE} fillOpacity="0.12" stroke={WHITE} strokeOpacity="0.28" />
            <circle cx="66" cy={y + 21} r="12" fill={SKY} />
            <text x="88" y={y + 18} fontSize="13" fontWeight="700" fill={WHITE}>{name}</text>
            <text x="88" y={y + 32} fontSize="10" fill={WHITE} fillOpacity="0.75">{sub}</text>
            <circle cx="256" cy={y + 21} r="10" fill={MINT} />
            <path d={`M251 ${y + 21} l4 4 l7 -8`} stroke={NAVY} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        );
      })}
    </Stage>
  );
}

/** Quote: a typical range turns into an exact price, then is accepted. */
export function QuoteGraphic() {
  const loop = useLoop();
  const D = 7;
  return (
    <Stage label="A price range turning into an exact quote that is accepted">
      <rect x="36" y="48" width="248" height="304" rx="22" fill={WHITE} fillOpacity="0.1" stroke={WHITE} strokeOpacity="0.3" />
      <text x="58" y="84" fontSize="12" fontWeight="800" fill={SKY} letterSpacing="2">QUOTE</text>
      <text x="58" y="116" fontSize="18" fontWeight="700" fill={WHITE}>Fix a leaking tap</text>
      <motion.g {...loop({ opacity: [0, 1, 1, 0, 0], y: [8, 0, 0, -8, -8] }, { dur: D, times: [0, 0.08, 0.32, 0.4, 1] })}>
        <text x="58" y="158" fontSize="11" fill={WHITE} fillOpacity="0.75">Typical range</text>
        <text x="58" y="190" fontSize="20" fontWeight="700" fill={WHITE}>₦3,000 to ₦8,000</text>
      </motion.g>
      <motion.g {...loop({ opacity: [0, 1, 1, 1, 0], scale: [0.85, 1, 1, 1, 1] }, { dur: D, times: [0.42, 0.5, 0.88, 0.96, 1] })} style={left}>
        <text x="58" y="158" fontSize="11" fill={WHITE} fillOpacity="0.75">Your exact quote</text>
        <text x="58" y="200" fontSize="38" fontWeight="800" fill={GOLD}>₦5,500</text>
      </motion.g>
      {[190, 140].map((w, i) => (
        <motion.rect key={w} x="58" y={236 + i * 18} width={w} height="7" rx="3.5" fill={WHITE} fillOpacity="0.28" style={left} initial={{ scaleX: 0 }} {...loop({ scaleX: [0, 1, 1, 0] }, { dur: D, times: [0, 0.25, 0.9, 1], delay: 0.2 + i * 0.3 })} />
      ))}
      <motion.rect x="58" y="294" width="204" height="40" rx="20" {...loop({ fill: [GOLD, GOLD, GOLD, MINT, MINT], scale: [1, 1, 1.04, 1, 1] }, { dur: D, times: [0, 0.6, 0.7, 0.78, 1] })} style={center} />
      <motion.text x="160" y="319" textAnchor="middle" fontSize="14" fontWeight="800" fill={NAVY} {...loop({ opacity: [1, 1, 1, 0, 0] }, { dur: D, times: [0, 0.66, 0.7, 0.74, 1] })}>Accept quote</motion.text>
      <motion.g {...loop({ opacity: [0, 0, 0, 1, 1] }, { dur: D, times: [0, 0.7, 0.74, 0.8, 1] })}>
        <path d="M120 314 l8 8 l16 -18" stroke={NAVY} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="154" y="319" fontSize="14" fontWeight="800" fill={NAVY}>Accepted</text>
      </motion.g>
    </Stage>
  );
}

/** Protected: money goes into a hold, the job progresses, then it is released. */
export function ProtectGraphic() {
  const loop = useLoop();
  const D = 7;
  const steps: [number, string][] = [[60, "Paid"], [160, "Working"], [260, "Done"]];
  return (
    <Stage label="Money entering a protected hold, the job progressing, then the money released to the artisan">
      <motion.path d="M160 56 L238 86 V164 C238 214 206 248 160 268 C114 248 82 214 82 164 V86 Z" fill={WHITE} fillOpacity="0.1" stroke={SKY} strokeWidth="3" strokeLinejoin="round" {...loop({ scale: [1, 1.04, 1, 1, 1], strokeOpacity: [0.6, 1, 0.8, 0.8, 0.6] }, { dur: D, times: [0, 0.2, 0.3, 0.9, 1] })} style={center} />
      <motion.path d="M124 160 l24 24 l44 -50" stroke={MINT} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" {...loop({ pathLength: [0, 1, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }, { dur: D, times: [0.2, 0.32, 0.7, 0.9, 1] })} />
      <text x="160" y="300" textAnchor="middle" fontSize="12" fontWeight="700" fill={SKY} letterSpacing="2">HELD SAFELY</text>
      <line x1="60" y1="336" x2="260" y2="336" stroke={WHITE} strokeOpacity="0.25" strokeWidth="4" strokeLinecap="round" />
      <motion.line x1="60" y1="336" x2="260" y2="336" stroke={GOLD} strokeWidth="4" strokeLinecap="round" style={left} initial={{ scaleX: 0 }} {...loop({ scaleX: [0, 0, 1, 1, 0] }, { dur: D, times: [0, 0.34, 0.7, 0.96, 1] })} />
      {steps.map(([x, label], i) => (
        <g key={label}>
          <motion.circle cx={x} cy="336" r="7" {...loop({ fill: [WHITE, MINT, MINT, MINT, WHITE] }, { dur: D, times: [0, 0.2 + i * 0.25, 0.8, 0.96, 1] })} />
          <text x={x} y="362" textAnchor="middle" fontSize="11" fill={WHITE} fillOpacity="0.85">{label}</text>
        </g>
      ))}
      <motion.g {...loop({ x: [0, 0, 0, 0, 100, 100], y: [-70, 100, 100, 100, 258, 258], opacity: [0, 1, 0, 0, 1, 0] }, { dur: D, times: [0, 0.2, 0.3, 0.72, 0.92, 1] })}>
        <circle cx="160" cy="80" r="22" fill={GOLD} />
        <text x="160" y="88" textAnchor="middle" fontSize="22" fontWeight="800" fill={NAVY}>₦</text>
      </motion.g>
    </Stage>
  );
}

/** Join: an artisan profile builds itself, then a request arrives. */
export function JoinGraphic() {
  const loop = useLoop();
  const D = 7;
  return (
    <Stage label="An artisan profile being created and a new job request arriving">
      <rect x="40" y="48" width="240" height="196" rx="22" fill={WHITE} fillOpacity="0.1" stroke={WHITE} strokeOpacity="0.3" />
      <motion.circle cx="86" cy="96" r="26" fill={SKY} style={center} {...loop({ scale: [0, 1, 1, 0] }, { dur: D, times: [0, 0.08, 0.92, 1] })} />
      <motion.rect x="124" y="82" width="124" height="11" rx="5.5" fill={WHITE} style={left} initial={{ scaleX: 0 }} {...loop({ scaleX: [0, 1, 1, 0] }, { dur: D, times: [0.04, 0.16, 0.92, 1] })} />
      <motion.rect x="124" y="102" width="86" height="9" rx="4.5" fill={WHITE} fillOpacity="0.5" style={left} initial={{ scaleX: 0 }} {...loop({ scaleX: [0, 1, 1, 0] }, { dur: D, times: [0.1, 0.22, 0.92, 1] })} />
      <motion.g {...loop({ opacity: [0, 1, 1, 0], y: [8, 0, 0, 0] }, { dur: D, times: [0.2, 0.3, 0.92, 1] })}>
        <rect x="62" y="140" width="76" height="26" rx="13" fill={SKY} />
        <text x="100" y="157" textAnchor="middle" fontSize="12" fontWeight="800" fill={NAVY}>Plumber</text>
        <rect x="146" y="140" width="106" height="26" rx="13" fill={GOLD} />
        <text x="199" y="157" textAnchor="middle" fontSize="12" fontWeight="800" fill={NAVY}>From ₦3,000</text>
      </motion.g>
      <motion.text x="62" y="206" fontSize="12" fill={WHITE} fillOpacity="0.8" {...loop({ opacity: [0, 1, 1, 0] }, { dur: D, times: [0.3, 0.4, 0.92, 1] })}>Serves Old GRA, Port Harcourt</motion.text>
      <motion.g {...loop({ opacity: [0, 1, 1, 0], y: [34, 0, 0, 0] }, { dur: D, times: [0.5, 0.6, 0.92, 1] })}>
        <rect x="40" y="274" width="240" height="70" rx="20" fill={GOLD} />
        <motion.circle cx="72" cy="309" r="9" fill={NAVY} style={center} {...loop({ scale: [1, 1.35, 1] }, { dur: 1.2 })} />
        <text x="96" y="304" fontSize="14" fontWeight="800" fill={NAVY}>New request</text>
        <text x="96" y="324" fontSize="11.5" fill={NAVY} fillOpacity="0.8">Fix a leaking tap · Ikeja</text>
      </motion.g>
    </Stage>
  );
}
