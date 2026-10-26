"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { areaLabel, areaSummary, tradeById } from "@/lib/catalog";
import { formatPriceRange } from "@/lib/money";
import { createRequest } from "@/server/actions";
import { normalisePhone } from "@/lib/phone";
import { Avatar, PinIcon, RatingLine, TRADE_GRADIENT } from "@/components/artisan-card";
import { Rise } from "@/components/motion";
import { ratingSummary } from "@/lib/reviews";
import { imageSrc } from "@/lib/image-src";
import { searchArtisans } from "@/lib/search";
import { Button, Card, ErrorNote, Field, LinkButton, VerifiedBadge, inputCls } from "@/components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 backdrop-blur-xl sm:p-7">
      <h2 className="mb-4 text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function ShareButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
      className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-line px-5 text-[15px] font-extrabold hover:border-white/50"
    >
      {done ? "Link copied" : "Share"}
    </button>
  );
}

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
  const [lightbox, setLightbox] = useState<string | null>(null);

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

  const [from, to] = TRADE_GRADIENT[a.trade];
  const { count, average } = ratingSummary(reviews);
  const joined = new Date(a.joinedAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" });
  const similar = searchArtisans(state, { trade: a.trade, stateId: undefined }).filter((x) => x.id !== a.id).slice(0, 3);
  const first = a.name.split(" ")[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-4">
        <Rise>
          <section className="overflow-hidden rounded-3xl border border-line bg-surface backdrop-blur-xl">
            <div className="relative h-32 sm:h-44" style={{ backgroundImage: `linear-gradient(120deg, ${from}, ${to})` }}>
              <span aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.7)_1px,transparent_1.5px)] [background-size:18px_18px]" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-14 flex items-end justify-between gap-3 sm:-mt-16">
                <Avatar name={a.name} size={112} trade={a.trade} ring verified={v.status === "verified"} photoId={a.photoId} />
                <div className="mb-1 hidden gap-2 sm:flex">
                  <a href="#request" className="inline-flex min-h-11 items-center rounded-full bg-gold px-6 text-[15px] font-extrabold text-midnight hover:brightness-95">Request a quote</a>
                  <ShareButton />
                </div>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{a.businessName}</h1>
              <p className="text-lg text-slate">
                {tradeById(a.trade).label} · {a.name}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5"><PinIcon />{areaSummary(a.areaIds, 3)}</span>
                <span>Joined {joined}</span>
                <span className="text-verified">{a.availability}</span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <VerifiedBadge v={v} detailed />
                {a.sample && <span className="rounded-full border border-gold/40 px-3 py-1 text-[13px] font-extrabold uppercase tracking-wide text-gold">Sample profile</span>}
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white/5 text-center">
                <div className="p-3"><p className="font-display text-2xl font-extrabold">{average === null ? "New" : <><span className="text-gold">★</span> {average.toFixed(1)}</>}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted">Rating</p></div>
                <div className="p-3"><p className="font-display text-2xl font-extrabold">{count}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted">{count === 1 ? "Review" : "Reviews"}</p></div>
                <div className="p-3"><p className="font-display text-2xl font-extrabold">{a.services.length}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted">{a.services.length === 1 ? "Service" : "Services"}</p></div>
              </div>
              <div className="mt-5 flex gap-2 sm:hidden">
                <a href="#request" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold px-6 text-[15px] font-extrabold text-midnight">Request a quote</a>
                <ShareButton />
              </div>
            </div>
          </section>
        </Rise>

        {a.phone && !own && (
          <Rise>
            <p className="rounded-3xl bg-panel p-5 text-white">
              <span className="text-sm font-bold text-gold">Contact</span>
              <br />
              <a href={`tel:${a.phone}`} className="font-display text-xl font-extrabold">{a.phone}</a>
              <span className="mt-1 block text-sm text-[#c9d4ee]">Shown because you have paid for a job with {first}.</span>
            </p>
          </Rise>
        )}

        <Rise>
          <Section title="About">
            <p className="whitespace-pre-line text-lg text-slate">{a.bio}</p>
          </Section>
        </Rise>

        {a.portfolio.length > 0 && (
          <Rise>
            <Section title="Recent work">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {a.portfolio.map((p) => (
                  <button key={p.id} type="button" onClick={() => setLightbox(p.id)} className="group relative overflow-hidden rounded-2xl border border-line text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc(p.imageId)} alt={p.caption || "Photo of past work"} loading="lazy" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                    {p.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-xs font-semibold text-white">{p.caption}</span>}
                  </button>
                ))}
              </div>
            </Section>
          </Rise>
        )}

        <Rise>
          <Section title="Services and prices">
            <ul className="divide-y divide-line">
              {a.services.map((s) => (
                <li key={s.title} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl font-display text-xl font-extrabold text-white" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>₦</span>
                  <span className="min-w-0 flex-1 basis-40">
                    <span className="block font-bold">{s.title}</span>
                    <span className="block text-sm text-muted">{s.maxKobo === null ? "Quote needed, this is a starting price" : "Typical range"}</span>
                  </span>
                  <span className="ml-auto font-display text-lg font-extrabold">{formatPriceRange(s.minKobo, s.maxKobo)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">These are typical ranges. You get a written quote to accept before any payment.</p>
          </Section>
        </Rise>

        <Rise>
          <Section title="Areas served">
            <div className="flex flex-wrap gap-2">
              {a.areaIds.map((i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate"><PinIcon />{areaLabel(i)}</span>
              ))}
            </div>
          </Section>
        </Rise>

        <Rise>
          <Section title="Verification">
            {v.status === "verified" ? (
              <>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {v.checks.map((c) => (
                    <li key={c} className="flex items-center gap-3 rounded-2xl bg-verified-soft px-4 py-3 font-semibold text-verified">
                      <span aria-hidden className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-verified text-sm font-extrabold text-black">✓</span>
                      {{ phone: "Phone number confirmed", id: "Government ID seen", address: "Address confirmed", guarantor: "Guarantor contacted" }[c]}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted">These are the checks the Sabihand team did. Verified does not guarantee the quality of any job.</p>
              </>
            ) : (
              <p className="text-slate">{first} has not completed Sabihand verification yet. You can still request a quote.</p>
            )}
          </Section>
        </Rise>

        <Rise>
          <Section title={`Reviews${count ? ` (${count})` : ""}`}>
            {reviews.length === 0 ? (
              <p className="text-slate">No reviews yet. Reviews only appear after a customer completes a job through Sabihand.</p>
            ) : (
              <ul className="divide-y divide-line">
                {reviews.map((r) => (
                  <li key={r.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <Avatar name={r.customerName} size={44} />
                    <div className="min-w-0">
                      <p className="font-bold">{r.customerName} <span className="ml-1 text-sm font-medium text-muted">{new Date(r.createdAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}</span></p>
                      <p className="text-gold" aria-label={`${r.rating} out of 5`}>
                        {"★".repeat(r.rating)}
                        <span className="text-white/20">{"★".repeat(5 - r.rating)}</span>
                      </p>
                      {r.text && <p className="mt-1 text-slate">{r.text}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </Rise>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="scroll-mt-28 p-6">
          <h2 id="request" className="scroll-mt-28 text-2xl font-extrabold">Request a quote</h2>
          {own ? (
            <p className="mt-3 text-slate">This is your own profile. Customers will see this page and can send you requests.</p>
          ) : a.sample ? (
            <p className="mt-3 text-slate">This is a sample profile that shows how an artisan page will look. It is not a real business and cannot be booked yet.</p>
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
        {similar.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-extrabold">Other {tradeById(a.trade).plural.toLowerCase()} on Sabihand</h2>
            <ul className="space-y-1">
              {similar.map((x) => (
                <li key={x.id}>
                  <Link href={`/artisans/${x.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5">
                    <Avatar name={x.name} size={44} trade={x.trade} verified={x.verification.status === "verified"} photoId={x.photoId} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{x.businessName}</span>
                      <span className="block truncate text-sm text-muted">{areaSummary(x.areaIds, 1)}</span>
                    </span>
                    <RatingLine artisanId={x.id} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </aside>
      {lightbox && (() => {
        const item = a.portfolio.find((p) => p.id === lightbox);
        if (!item) return null;
        return (
          <div role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setLightbox(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <figure className="max-h-full max-w-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(item.imageId)} alt={item.caption || "Photo of past work"} className="max-h-[80vh] w-auto rounded-2xl" />
              {item.caption && <figcaption className="mt-3 text-center text-white">{item.caption}</figcaption>}
            </figure>
            <button aria-label="Close" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-lg font-extrabold text-white">✕</button>
          </div>
        );
      })()}
    </div>
  );
}
