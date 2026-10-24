"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaById, tradeById } from "@/lib/seed";
import { formatPriceRange } from "@/lib/money";
import { createRequest } from "@/lib/engine";
import { Avatar, RatingLine } from "@/components/artisan-card";
import { Button, Card, Chip, ErrorNote, Field, VerifiedBadge, inputCls } from "@/components/ui";

export default function ArtisanProfile() {
  const { id } = useParams<{ id: string }>();
  const { state, run } = useStore();
  const router = useRouter();
  const a = state.artisans.find((x) => x.id === id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!a) {
    return (
      <Card className="p-10 text-center">
        <h1 className="text-2xl font-extrabold">Artisan not found</h1>
        <Link href="/artisans" className="mt-3 inline-block font-bold text-trust">Back to search</Link>
      </Card>
    );
  }

  const reviews = state.reviews.filter((r) => r.artisanId === a.id && !r.hidden);
  const selectedArea = areaId || a.areaIds[0];
  const v = a.verification;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state.role !== "customer") {
      setError("Switch to “Viewing as: Customer” to send a request.");
      return;
    }
    const before = state.bookings.length;
    const err = run((s, ctx) => createRequest(s, { artisanId: a!.id, trade: a!.trade, areaId: selectedArea, title, description, preferredDate: date || "Flexible" }, ctx));
    if (err) return setError(err);
    setError(null);
    void before;
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
              <dd>{a.areaIds.map((i) => areaById(i)?.name).join(", ")}</dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Availability</dt>
              <dd>{a.availability}</dd>
            </div>
          </dl>
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
          <h2 className="mb-4 text-2xl font-extrabold">Portfolio</h2>
          {a.portfolio.length === 0 ? (
            <p className="text-slate">No photos of past work yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {a.portfolio.map((p) => (
                <figure key={p.id}>
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-[#dce4f7] to-[#f0f3fa] text-sm font-semibold text-muted">Sample photo</div>
                  <figcaption className="mt-1.5 text-sm font-semibold">{p.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}
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
          <p className="mb-4 mt-1 text-sm text-slate">Tell {a.name.split(" ")[0]} what you need. You pay nothing yet.</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="What needs doing?">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Kitchen tap keeps dripping" />
            </Field>
            <Field label="Details" hint="Where in the house, what you have tried, any photos you will share later.">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} placeholder="Describe the job so the artisan can give a fair price" />
            </Field>
            <Field label="Your area">
              <select value={selectedArea} onChange={(e) => setAreaId(e.target.value)} className={inputCls}>
                {a.areaIds.map((i) => (
                  <option key={i} value={i}>
                    {areaById(i)?.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preferred date (optional)">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" className="w-full">
              Send request
            </Button>
            <p className="text-center text-xs text-muted">
              <Chip>Demo</Chip> No real message is sent in demo mode.
            </p>
          </form>
        </Card>
      </aside>
    </div>
  );
}
