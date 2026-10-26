"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useStore } from "@/lib/store";
import { useUnread } from "@/lib/unread";
import { UnreadPill } from "./chat-panel";

/** The wordmark. On a dark page it switches to the light-on-midnight version by itself. */
export function Logo({ dark = false, width = 150 }: { dark?: boolean; width?: number }) {
  const height = Math.round(width * 0.1426);
  if (dark) return <Image src="/brand/wordmark-on-midnight.svg" alt="Sabihand" width={width} height={height} priority unoptimized />;
  return (
    <>
      <Image src="/brand/wordmark-light.svg" alt="Sabihand" width={width} height={height} priority unoptimized className="dark:hidden" />
      <Image src="/brand/wordmark-on-midnight.svg" alt="Sabihand" width={width} height={height} priority unoptimized className="hidden dark:block" />
    </>
  );
}

function useNav() {
  const { viewer, me } = useStore();
  const items = [{ href: "/artisans", label: "Find artisans" }];
  if (viewer) items.push({ href: "/requests", label: "My requests" });
  items.push(me ? { href: "/artisan", label: "My jobs" } : { href: "/artisan/join", label: "For artisans" });
  if (!viewer) items.splice(1, 0, { href: "/#how-it-works", label: "How it works" });
  return items;
}

function Avatar({ name, image }: { name: string; image?: string }) {
  if (image) {
    // Google's picture; its host blocks hotlinks that send a referrer.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={36} height={36} referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />;
  }
  return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight font-display text-sm font-extrabold text-gold">{name.trim()[0]?.toUpperCase()}</span>;
}

/** `guestView` always shows the Sign in and Get started buttons: the landing page keeps the signed-in person off the page. */
function AccountMenu({ guestView = false }: { guestView?: boolean }) {
  const { viewer } = useStore();
  const [open, setOpen] = useState(false);
  if (!viewer || guestView) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/sign-in" className="hidden min-h-10 items-center rounded-full px-4 text-[13px] font-extrabold uppercase tracking-wide text-ink hover:bg-white/10 sm:inline-flex">
          Sign in
        </Link>
        <Link href="/auth/sign-up" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-gold px-4 text-[13px] font-extrabold uppercase tracking-wide text-midnight transition hover:brightness-110 sm:px-6">
          Get started
        </Link>
      </div>
    );
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={`Account menu for ${viewer.name}`} className="flex min-h-10 items-center gap-2 rounded-full border-2 border-line py-0.5 pl-0.5 pr-3 hover:border-ink">
        <Avatar name={viewer.name} image={viewer.image} />
        <span className="hidden max-w-28 truncate text-sm font-bold sm:inline">{viewer.name}</span>
        <span aria-hidden className="text-xs text-muted">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-line bg-solid p-2 shadow-xl" onMouseLeave={() => setOpen(false)}>
          <div className="border-b border-line px-3 py-2">
            <p className="truncate font-bold">{viewer.name}</p>
            <p className="truncate text-sm text-muted">{viewer.email}</p>
          </div>
          <button
            role="menuitem"
            onClick={async () => {
              await authClient.signOut();
              // Full reload on purpose: clears every piece of signed-in state the server rendered.
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = "/";
            }}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-bold text-alert hover:bg-alert-soft"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const path = usePathname();
  const items = useNav();
  const { state, viewer } = useStore();
  const unread = useUnread();
  // Unread messages split by the side of the booking the viewer is on.
  const badge = (href: string) => {
    if (!viewer) return 0;
    const asCustomer = href === "/requests";
    if (!asCustomer && href !== "/artisan") return 0;
    return state.bookings.filter((b) => (b.customerId === viewer.id) === asCustomer).reduce((n, b) => n + (unread.byBooking[b.id] ?? 0), 0);
  };
  const [menu, setMenu] = useState(false);
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 rounded-full border border-white/10 bg-black/60 py-2 pl-5 pr-2 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" aria-label="Sabihand home" className="flex-none justify-self-start">
          <Logo width={132} />
        </Link>
        <nav className="hidden gap-1 rounded-full border border-white/10 bg-white/5 p-1.5 md:flex" aria-label="Main">
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`rounded-full px-4 py-2 text-[13px] font-extrabold uppercase tracking-wide transition ${active(i.href) ? "bg-white/15 text-white" : "text-slate hover:text-white"}`}>
              {i.label}
              <UnreadPill n={badge(i.href)} />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 justify-self-end">
          <AccountMenu guestView={path === "/"} />
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu" className="ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 md:hidden">
            <span aria-hidden className="text-lg leading-none">{menu ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {menu && (
        <nav className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/10 bg-solid p-2 md:hidden" aria-label="Mobile">
          <ul className="grid gap-1">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} onClick={() => setMenu(false)} className={`block rounded-2xl px-4 py-3 text-sm font-extrabold uppercase tracking-wide ${active(i.href) ? "bg-white/15 text-white" : "text-slate"}`}>
                  {i.label}
                  <UnreadPill n={badge(i.href)} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div>
          <Logo width={128} />
          <p className="mt-4 max-w-xs text-sm text-slate">Trusted hands, near you. Verified plumbers, electricians, tailors and carpenters, with the price agreed before the work starts.</p>
        </div>
        <div>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted">Customers</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li><Link href="/artisans" className="hover:text-link">Find an artisan</Link></li>
            <li><Link href="/requests" className="hover:text-link">My requests</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted">Artisans</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li><Link href="/artisan/join" className="hover:text-link">Create your profile</Link></li>
            <li><Link href="/artisan" className="hover:text-link">My jobs</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-[13px] text-muted">
        <p>© 2026 Sabihand · Serving Port Harcourt, Rivers State</p>
        <p className="mt-2 flex justify-center gap-4 font-semibold">
          <Link href="/terms" className="hover:text-link">Terms</Link>
          <Link href="/privacy" className="hover:text-link">Privacy</Link>
          <Link href="/disputes" className="hover:text-link">Disputes</Link>
        </p>
      </div>
    </footer>
  );
}
