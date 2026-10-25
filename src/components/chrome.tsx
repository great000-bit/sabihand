"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useStore } from "@/lib/store";
import { CITIES } from "@/lib/catalog";
import { LinkButton } from "./ui";

export function Logo({ dark = false, width = 150 }: { dark?: boolean; width?: number }) {
  return <Image src={dark ? "/brand/wordmark-on-midnight.svg" : "/brand/wordmark-light.svg"} alt="Sabihand" width={width} height={Math.round(width * 0.1426)} priority unoptimized />;
}

function useNav() {
  const { viewer, me } = useStore();
  const items = [{ href: "/artisans", label: "Find artisans" }];
  if (viewer) items.push({ href: "/requests", label: "My requests" });
  items.push(me ? { href: "/artisan", label: "My jobs" } : { href: "/artisan/join", label: "For artisans" });
  if (!viewer) items.splice(1, 0, { href: "/#how-it-works", label: "How it works" });
  if (viewer?.isAdmin) items.push({ href: "/admin", label: "Admin" });
  return items;
}

function Avatar({ name }: { name: string }) {
  return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight font-display text-sm font-extrabold text-gold">{name.trim()[0]?.toUpperCase()}</span>;
}

function AccountMenu() {
  const { viewer } = useStore();
  const [open, setOpen] = useState(false);
  if (!viewer) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/sign-in" className="hidden min-h-10 items-center rounded-full px-4 text-[15px] font-bold text-midnight hover:bg-mist sm:inline-flex">
          Sign in
        </Link>
        <LinkButton href="/auth/sign-up" variant="dark" className="!min-h-10 !px-5">
          Get started
        </LinkButton>
      </div>
    );
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" className="flex min-h-10 items-center gap-2 rounded-full border-2 border-line py-0.5 pl-0.5 pr-3 hover:border-midnight">
        <Avatar name={viewer.name} />
        <span className="hidden max-w-28 truncate text-sm font-bold sm:inline">{viewer.name}</span>
        <span aria-hidden className="text-xs text-muted">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-line bg-white p-2 shadow-xl" onMouseLeave={() => setOpen(false)}>
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
  const [menu, setMenu] = useState(false);
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Sabihand home" className="flex-none">
          <Logo width={132} />
        </Link>
        <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`rounded-full px-4 py-2 text-[15px] font-bold ${active(i.href) ? "bg-midnight text-white" : "text-slate hover:bg-mist"}`}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <AccountMenu />
          <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line md:hidden">
            <span aria-hidden className="text-lg leading-none">{menu ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {menu && (
        <nav className="border-t border-line bg-white px-4 py-3 md:hidden" aria-label="Mobile">
          <ul className="grid gap-1">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} onClick={() => setMenu(false)} className={`block rounded-2xl px-4 py-3 text-base font-bold ${active(i.href) ? "bg-midnight text-white" : "text-slate"}`}>
                  {i.label}
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
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div>
          <Logo width={128} />
          <p className="mt-4 max-w-xs text-sm text-slate">Trusted hands, near you. Verified plumbers, electricians, tailors and carpenters, with the price agreed before the work starts.</p>
        </div>
        <div>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted">Customers</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li><Link href="/artisans" className="hover:text-trust">Find an artisan</Link></li>
            <li><Link href="/requests" className="hover:text-trust">My requests</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted">Artisans</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li><Link href="/artisan/join" className="hover:text-trust">Create your profile</Link></li>
            <li><Link href="/artisan" className="hover:text-trust">My jobs</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-[13px] text-muted">
        © 2026 Sabihand · Serving {CITIES.join(", ")}
      </div>
    </footer>
  );
}
