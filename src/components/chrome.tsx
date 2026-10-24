"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export function Logo({ dark = false, width = 150 }: { dark?: boolean; width?: number }) {
  return <Image src={dark ? "/brand/wordmark-on-midnight.svg" : "/brand/wordmark-light.svg"} alt="Sabihand" width={width} height={Math.round(width * 0.131)} priority unoptimized />;
}

export function DemoBanner() {
  return (
    <div className="bg-midnight px-4 py-2 text-center text-[13px] font-semibold text-white">
      <span className="text-gold">Demo mode.</span> Sample artisans and a pretend payment. No real money moves and nothing here is a real person.
    </div>
  );
}

const NAV: Record<Role, { href: string; label: string }[]> = {
  customer: [
    { href: "/artisans", label: "Find artisans" },
    { href: "/requests", label: "My requests" },
  ],
  artisan: [
    { href: "/artisan", label: "My jobs" },
    { href: "/artisan/join", label: "Join as artisan" },
  ],
  admin: [{ href: "/admin", label: "Admin" }],
};

function AccountMenu() {
  const { data } = authClient.useSession();
  const user = data?.user;
  if (!user) {
    return (
      <Link href="/auth/sign-in" className="min-h-10 rounded-full border-2 border-line px-4 py-2 text-sm font-bold text-midnight hover:border-midnight">
        Sign in
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="hidden max-w-32 truncate font-bold text-midnight sm:inline">{user.name}</span>
      <button onClick={() => authClient.signOut()} className="min-h-10 rounded-full px-3 font-semibold text-muted hover:text-ink">
        Sign out
      </button>
    </span>
  );
}

export function Header() {
  const { state, setRole, reset } = useStore();
  const path = usePathname();
  const items = NAV[state.role];
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Sabihand home">
          <Logo width={132} />
        </Link>
        <nav className="order-3 flex w-full gap-1 sm:order-none sm:w-auto" aria-label="Main">
          {items.map((i) => {
            const active = path === i.href || (i.href !== "/" && path.startsWith(i.href + "/"));
            return (
              <Link key={i.href} href={i.href} className={`rounded-full px-4 py-2 text-[15px] font-bold ${active ? "bg-midnight text-white" : "text-slate hover:bg-mist"}`}>
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="role">
            Viewing as
          </label>
          <select id="role" value={state.role} onChange={(e) => setRole(e.target.value as Role)} className="min-h-10 rounded-full border-2 border-line bg-white px-3 text-sm font-bold">
            <option value="customer">Viewing as: Customer</option>
            <option value="artisan">Viewing as: Artisan</option>
            <option value="admin">Viewing as: Admin</option>
          </select>
          <button onClick={reset} className="hidden min-h-10 rounded-full px-3 text-sm font-semibold text-muted hover:text-ink sm:block" title="Reset all demo data">
            Reset demo
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white px-4 py-8 text-center text-sm text-muted">
      <p>Sabihand · Built for the Cowrywise Ambassadors Innovation Challenge 2026 · Prototype</p>
    </footer>
  );
}
