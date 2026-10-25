import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { BookingStatus, Verification } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/booking";

type Variant = "primary" | "dark" | "gold" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-trust text-white hover:bg-[#1c43b8]",
  dark: "bg-midnight text-white hover:bg-midnight-2 dark:bg-white dark:text-midnight dark:hover:bg-[#dbe5ff]",
  gold: "bg-gold text-midnight hover:brightness-95",
  ghost: "bg-surface text-ink border-2 border-line hover:border-ink",
  danger: "bg-surface text-alert border-2 border-alert/40 hover:bg-alert-soft",
};
const BASE = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...rest} className={`${BASE} ${VARIANTS[variant]} ${className}`} />;
}

export function LinkButton({ href, variant = "primary", children, className = "" }: { href: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line/70 bg-surface shadow-[0_1px_2px_rgba(11,31,75,0.04),0_10px_30px_-14px_rgba(11,31,75,0.14)] ${className}`}>{children}</div>;
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "dark" | "gold" | "green" | "alert" | "blue" }) {
  const t = {
    plain: "bg-surface border-line text-slate",
    dark: "bg-midnight border-midnight text-white",
    gold: "bg-gold-soft border-gold/50 text-gold-ink",
    green: "bg-verified-soft border-verified/20 text-verified",
    alert: "bg-alert-soft border-alert/20 text-alert",
    blue: "bg-tint-blue border-trust/20 text-link",
  }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-bold ${t}`}>{children}</span>;
}

const CHECK_LABEL = { phone: "Phone", id: "ID", address: "Address", guarantor: "Guarantor" } as const;

export function VerifiedBadge({ v, detailed = false }: { v: Verification; detailed?: boolean }) {
  if (v.status === "verified") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Chip tone="green">✓ Verified</Chip>
        {detailed && v.checks.map((c) => <Chip key={c}>{CHECK_LABEL[c]} checked</Chip>)}
      </span>
    );
  }
  if (v.status === "pending") return <Chip tone="gold">Verification pending</Chip>;
  if (v.status === "rejected") return <Chip tone="alert">Not verified</Chip>;
  return <Chip>Not yet verified</Chip>;
}

export function StatusPill({ status }: { status: BookingStatus }) {
  const tone: Record<BookingStatus, "plain" | "dark" | "gold" | "green" | "alert" | "blue"> = {
    pending_response: "gold",
    accepted: "blue",
    declined: "plain",
    awaiting_payment: "blue",
    confirmed: "dark",
    in_progress: "dark",
    completed: "green",
    cancelled: "plain",
    disputed: "alert",
  };
  return <Chip tone={tone[status]}>{STATUS_LABEL[status]}</Chip>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full min-h-11 rounded-2xl border-2 border-line bg-surface px-4 py-2.5 text-[16px] text-ink placeholder:text-muted focus:border-trust";

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl border border-alert/30 bg-alert-soft px-4 py-3 text-sm font-semibold text-alert">
      {message}
    </p>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="px-6 py-12 text-center">
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-md text-slate">{children}</div>}
    </Card>
  );
}

export function PageHeader({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        {children && <p className="mt-2 max-w-2xl text-lg text-slate">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Eyebrow({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "blue" }) {
  return <p className={`mb-3 text-[13px] font-extrabold uppercase tracking-[0.14em] ${tone === "gold" ? "text-gold" : "text-link"}`}>{children}</p>;
}
