import Image from "next/image";
import type { ReactNode } from "react";

/** A Canva-style feature panel: a big rounded colour block with a photo on one side and the message on the other. */
export function FeatureRow({
  tone,
  image,
  alt,
  flip = false,
  eyebrow,
  title,
  children,
  action,
  dark = false,
  small = false,
}: {
  tone: string;
  image: string;
  alt: string;
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
          <Image src={image} alt={alt} fill sizes="(max-width: 768px) 260px, 380px" className="object-cover object-top" />
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
