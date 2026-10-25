"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaLabel, areaSummary, tradeById } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/money";
import { createRequest } from "@/server/actions";
import { normalisePhone } from "@/lib/phone";
import { Avatar, RatingLine } from "@/components/artisan-card";
import { Button, Card, ErrorNote, Field, LinkButton, VerifiedBadge, inputCls } from "@/components/ui";

export default function ArtisanProfile() {
  const { id } = useParams<{ id: string }>();
  const { state, viewer, act, busy } = useStore();
  const router = useRouter();
  const a = state.artisans.find((x) => x.id === id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState("");
  const [date, setDate] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!a) {
    return (
      <Card className="p-10 text-center">
        <h1 className="text-2xl font-extrabold">Artisan not found</h1>
        <Link href="/artisans" className="mt-3 inline-block font-bold text-link">Back to search</Link>
      </Card>
    );
  }

  const reviews = state.reviews.filter((r) => r.artisanId === a.id && !r.hidden);
  const selectedArea = areaId || a.areaIds[0];
  const v = a.verification;

  const own = Boolean(viewer && a.ownerId === viewer.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalisePhone(phone)) return setError("Enter a Nigerian mobile number the artisan can reach you on, like 0803 123 4567.");
    const err = await act(() => createRequest({ artisanId: a!.id, areaId: selectedArea, title, description, preferredDate: date || "Flexible", phone }));
    if (err) return setError(err);
    setError(null);
    router.push("/requests");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="flex gap-5">
            <Avatar name={a.name} size={76} />
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold">{a.businessName}</h1>
              <p className="text-slate">
                {tradeById(a.trade).label} · {a.name}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <VerifiedBadge v={v} detailed />
                <RatingLine artisanId={a.id} />
              </div>
            </div>
          </div>
          <p className="mt-5 text-lg text-slate">{a.bio}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold text-muted">Serves</dt>
              <dd>{areaSummary(a.areaIds, 6)}</dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Availability</dt>
              <dd>{a.availability}</dd>
            </div>
          </dl>
          {a.phone && !own && (
            <p className="mt-4 rounded-2xl bg-midnight p-4 text-white">
              <span className="text-sm font-bold text-gold">Contact</span>
              <br />
              <a href={`tel:${a.phone}`} className="font-display text-xl font-extrabold">{a.phone}</a>
              <span className="mt-1 block text-sm text-[#c9d4ee]">Shown because you have paid for a job with {a.name.split(" ")[0]}.</span>
            </p>
          )}
          {v.status === "verified" ? (
            <p className="mt-4 rounded-2xl bg-verified-soft p-3 text-sm text-verified">Verified means Sabihand checked: {v.checks.join(", ")}. It does not guarantee the quality of any job.</p>
          ) : (
            <p className="mt-4 rounded-2xl bg-mist p-3 text-sm text-slate">This artisan has not completed Sabihand verification yet. You can still request a quote.</p>
          )}
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-4 text-2xl font-extrabold">Services and prices</h2>
          <ul className="divide-y divide-line">
            {a.services.map((s) => (
              <li key={s.title} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-semibold">{s.title}</span>
                <span className="font-display text-lg font-extrabold">{formatPriceRange(s.minKobo, s.maxKobo)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">These are typical ranges. You get a written quote to accept before any payment.</p>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-4 text-2xl font-extrabold">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-slate">No reviews yet. Reviews only appear after a customer completes a job through Sabihand.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl bg-mist p-4">
                  <p className="font-bold">
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span> <span className="ml-2 text-sm font-medium text-muted">{r.customerName}</span>
                  </p>
                  {r.text && <p className="mt-1 text-slate">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-6">
          <h2 className="text-2xl font-extrabold">Request a quote</h2>
          {own ? (
            <p className="mt-3 text-slate">This is your own profile. Customers will see this page and can send you requests.</p>
          ) : !viewer ? (
            <>
              <p className="mb-5 mt-1 text-slate">Create a free account to send {a.name.split(" ")[0]} your request. You pay nothing until you accept a quote.</p>
              <div className="grid gap-3">
                <LinkButton href={`/auth/sign-up?next=${encodeURIComponent(`/artisans/${a.id}`)}`}>Create an account</LinkButton>
                <LinkButton href={`/auth/sign-in?next=${encodeURIComponent(`/artisans/${a.id}`)}`} variant="ghost">Sign in</LinkButton>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 mt-1 text-sm text-slate">Tell {a.name.split(" ")[0]} what you need. You pay nothing yet.</p>
              <form onSubmit={submit} className="space-y-4">
                <Field label="What needs doing?">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Kitchen tap keeps dripping" maxLength={120} required />
                </Field>
                <Field label="Details" hint="Where in the house, what you have tried.">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} placeholder="Describe the job so the artisan can give a fair price" maxLength={2000} required />
                </Field>
                <Field label="Your area">
                  <select value={selectedArea} onChange={(e) => setAreaId(e.target.value)} className={inputCls}>
                    {a.areaIds.map((i) => (
                      <option key={i} value={i}>
                        {areaLabel(i)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Preferred date (optional)">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Your phone number" hint="Shared with the artisan only after you pay.">
                  <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="0803 123 4567" required />
                </Field>
                <ErrorNote message={error} />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending..." : "Send request"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </aside>
    </div>
  );
}
