import Image from "next/image";
import type { ReactNode } from "react";

/** A Canva-style feature panel: a big rounded colour block with a photo on one side and the message on the other. */
export function FeatureRow({
  tone,
  image,
  alt,
  icon,
  flip = false,
  eyebrow,
  title,
  children,
  action,
  dark = false,
  small = false,
}: {
  tone: string;
  /** Optional. Leave out to show the icon panel instead. Never reuse a photo already shown elsewhere on the page. */
  image?: string;
  alt?: string;
  icon?: ReactNode;
  flip?: boolean;
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  dark?: boolean;
  /** For low-resolution photos: keeps the picture from being stretched. */
  small?: boolean;
}) {
  return (
    <section data-aos="fade-up" className={`grid items-center gap-8 overflow-hidden rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-12 md:grid-cols-2 md:gap-14 lg:p-16 ${tone} ${dark ? "text-white" : "text-midnight"}`}>
      <div className={`mx-auto w-full ${small ? "max-w-[220px] sm:max-w-[260px]" : "max-w-[240px] sm:max-w-sm"} ${flip ? "md:order-2" : ""}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] ring-4 ring-white/70">
          {image ? (
            <Image src={image} alt={alt ?? ""} fill sizes="(max-width: 768px) 260px, 380px" className="object-cover object-top" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center ${dark ? "bg-white/10 text-gold" : "bg-white/70 text-trust"}`} aria-hidden>
              <span className="block h-1/3 w-1/3 [&>svg]:h-full [&>svg]:w-full">{icon}</span>
            </div>
          )}
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <p className={`mb-3 text-[13px] font-extrabold uppercase tracking-[0.14em] ${dark ? "text-gold" : "text-trust"}`}>{eyebrow}</p>
        <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h2>
        <div className={`mt-4 space-y-3 text-base sm:text-lg ${dark ? "text-[#c9d4ee]" : "text-slate"}`}>{children}</div>
        {action && <div className="mt-7">{action}</div>}
      </div>
    </section>
  );
}

export function Ticks({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-sm font-extrabold ${dark ? "bg-gold text-midnight" : "bg-midnight text-white"}`}>✓</span>
          <span className={dark ? "text-white" : "text-ink"}>{i}</span>
        </li>
      ))}
    </ul>
  );
}

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ICONS = {
  search: (
    <svg {...svg}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /><path d="m8.6 11 1.7 1.7 3.1-3.4" /></svg>
  ),
  quote: (
    <svg {...svg}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7M9 15.5h7M9 8.5h3" /></svg>
  ),
  shield: (
    <svg {...svg}><path d="M12 3 5 6v5.5c0 4.3 2.9 7.9 7 9.5 4.1-1.6 7-5.2 7-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
  ),
  tools: (
    <svg {...svg}><path d="M14.5 6.5a3.5 3.5 0 0 0 4.2 4.2L21 13l-8 8-3-3 8-8" /><path d="m9 18-5.5-5.5 3-3L12 15" /></svg>
  ),
};
