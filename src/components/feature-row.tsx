import Image from "next/image";
import type { ReactNode } from "react";

/**
 * A Canva-style feature panel: a big rounded colour block with a picture on one side and the message on the other.
 * Without an `image` the picture area stays a clean blank block, ready for a motion graphic.
 */
export function FeatureRow({
  tone,
  image,
  alt,
  graphic,
  flip = false,
  eyebrow,
  title,
  children,
  action,
  dark = false,
  small = false,
}: {
  tone: string;
  /** Optional. Never reuse a photo already shown elsewhere on the page. */
  image?: string;
  alt?: string;
  /** An animated graphic for the picture slot. It is drawn light, so the slot behind it is always dark. */
  graphic?: ReactNode;
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
    <section data-aos="fade-up" className={`grain grid items-center gap-8 overflow-hidden rounded-[2rem] p-6 sm:rounded-[2.5rem] sm:p-12 md:grid-cols-2 md:gap-14 lg:p-16 ${tone} ${dark ? "text-white" : "text-ink"}`}>
      <div className={`mx-auto w-full ${small ? "max-w-[220px] sm:max-w-[260px]" : "max-w-[240px] sm:max-w-sm"} ${flip ? "md:order-2" : ""}`}>
        <div className={`relative aspect-[4/5] overflow-hidden rounded-[1.75rem] ring-4 ${graphic ? "bg-midnight ring-white/70 dark:bg-black/60 dark:ring-white/10" : dark ? "bg-white/10 ring-white/15" : "bg-white/60 ring-white/70 dark:bg-white/5 dark:ring-white/10"}`}>
          {graphic}
          {image && <Image src={image} alt={alt ?? ""} fill sizes="(max-width: 768px) 260px, 380px" className="object-cover object-top" />}
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <p className={`mb-3 text-[13px] font-extrabold uppercase tracking-[0.14em] ${dark ? "text-gold" : "text-link"}`}>{eyebrow}</p>
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
          <span className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-sm font-extrabold ${dark ? "bg-gold text-midnight" : "bg-ink text-mist"}`}>✓</span>
          <span className={dark ? "text-white" : "text-ink"}>{i}</span>
        </li>
      ))}
    </ul>
  );
}
