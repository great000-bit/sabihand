import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export const LEGAL_UPDATED = "25 October 2026";
export const SUPPORT_EMAIL = "greatemmanwori@gmail.com";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-muted">Last updated {LEGAL_UPDATED}</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-4 text-lg text-slate">{intro}</p>
      <Card className="mt-6 border-gold/40 p-4 text-sm text-slate">
        <strong className="text-ink">Early version.</strong> Sabihand is launching. These words explain how the service works today and may change as we learn.
        If something here worries you, write to us at <a className="font-bold text-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </Card>
      <div className="mt-8 space-y-8">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate">{children}</div>
    </section>
  );
}
