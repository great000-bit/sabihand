"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import * as actions from "@/server/actions";
import { actorOn } from "@/lib/access";
import { nextActions } from "@/lib/booking";
import { areaById, tradeById } from "@/lib/catalog";
import { artisanPayoutKobo, commissionKobo, formatNaira, nairaToKobo } from "@/lib/money";
import { SignedInOnly } from "@/components/gate";
import { Button, Card, Chip, ErrorNote, Field, StatusPill, inputCls } from "@/components/ui";
import type { Booking } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Panel({ title, children, tone = "white" }: { title: string; children: React.ReactNode; tone?: "white" | "gold" | "dark" }) {
  const c = { white: "bg-white", gold: "bg-gold-soft border-gold/40", dark: "bg-midnight text-white border-midnight" }[tone];
  return (
    <Card className={`p-6 ${c}`}>
      <h2 className="mb-3 text-xl font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

export default function RequestDetail() {
  return (
    <SignedInOnly title="Sign in to see this request">
      <Detail />
    </SignedInOnly>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const paid = useSearchParams().get("paid") === "1";
  const { state, viewer, act, busy, config } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [quoteNaira, setQuoteNaira] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const b: Booking | undefined = state.bookings.find((x) => x.id === id);
  if (!b) return <Card className="p-10 text-center"><h1 className="text-2xl font-extrabold">Request not found</h1><p className="mt-1 text-slate">It may belong to another account.</p><Link href="/requests" className="mt-3 inline-block font-bold text-trust">Back to requests</Link></Card>;

  const artisan = state.artisans.find((a) => a.id === b.artisanId);
  const payment = state.payments.find((p) => p.bookingId === b.id);
  const review = state.reviews.find((r) => r.bookingId === b.id);
  const actor = actorOn(state, b, viewer);
  const can = (to: Parameters<typeof nextActions>[0]) => (actor ? nextActions(b.status, actor) : []).includes(to);
  const act2 = async (fn: () => Promise<{ error: string | null }>) => setErr(await act(fn));
  const back = actor === "artisan" ? "/artisan" : actor === "admin" ? "/admin" : "/requests";
  const showPrivacy = actor === "customer" ? artisan?.phone : actor === "artisan" ? b.customerPhone : "";
  const quoteKobo = quoteNaira ? nairaToKobo(Number(quoteNaira)) : 0;

  async function pay() {
    setErr(null);
    const r = await actions.startPayment(b!.id).catch(() => ({ error: "We could not reach Sabihand. Try again.", url: undefined }));
    if (r.error || !r.url) return setErr(r.error ?? "Could not start the payment.");
    window.location.assign(r.url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={back} className="text-sm font-bold text-trust">← Back</Link>
              <h1 className="mt-2 text-3xl font-extrabold">{b.title}</h1>
              <p className="text-slate">
                {tradeById(b.trade).label} · {artisan?.businessName} · {areaById(b.areaId)?.name}
              </p>
            </div>
            <StatusPill status={b.status} />
          </div>
          <p className="mt-4 text-lg text-slate">{b.description}</p>
          <p className="mt-3 text-sm text-muted">
            Requested by {b.customerName} · Preferred date: {b.preferredDate}
          </p>
        </Card>

        {b.quote && (
          <Panel title="Quote" tone={b.status === "accepted" ? "gold" : "white"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{b.quote.description}</p>
              <p className="font-display text-3xl font-extrabold">{formatNaira(b.quote.amountKobo)}</p>
            </div>
            <p className="mt-1 text-sm text-slate">Proposed date: {b.quote.proposedDate}. Price or scope changes need both sides to agree again.</p>
            {(actor === "artisan" || actor === "admin") && (
              <p className="mt-2 text-sm text-muted">
                Sabihand commission {formatNaira(commissionKobo(b.quote.amountKobo))} · artisan receives {formatNaira(artisanPayoutKobo(b.quote.amountKobo))}
              </p>
            )}
          </Panel>
        )}

        {payment && (
          <Panel title="Payment" tone={payment.status === "held" ? "dark" : "white"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-3xl font-extrabold">{formatNaira(payment.amountKobo)}</p>
              <Chip tone={payment.status === "held" ? "gold" : payment.status === "released" ? "green" : "plain"}>{payment.status === "held" ? "Held safely" : payment.status === "released" ? (payment.payout ? "Paid to artisan’s bank" : "Released to artisan") : "Refunded"}</Chip>
            </div>
            <p className={`mt-2 text-sm ${payment.status === "held" ? "text-[#c9d4ee]" : "text-slate"}`}>
              {payment.status === "held" && "The artisan is paid only after you confirm the job is done."}
              {payment.status === "released" && "Released after the customer confirmed the job."}
              {payment.status === "refunded" && "Returned to the customer."}
            </p>
          </Panel>
        )}

        <Panel title="Timeline">
          <ol className="space-y-3">
            {[...b.events].reverse().map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-trust" />
                <span>
                  <b>{e.note ?? `Status: ${e.to.replace("_", " ")}`}</b> <span className="text-muted">· {e.actor} · {fmtDate(e.at)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <Panel title="What happens next">
          <div className="space-y-3">
            <ErrorNote message={err} />
            {paid && actor === "customer" && b.status === "confirmed" && <p className="rounded-2xl bg-verified-soft p-3 text-sm font-semibold text-verified">Payment received. It is held safely until you confirm the job.</p>}
            {showPrivacy && b.status !== "pending_response" && payment && (
              <p className="rounded-2xl bg-mist p-3 text-sm">
                <span className="font-bold text-muted">{actor === "customer" ? `${artisan?.name}'s phone` : `${b.customerName}'s phone`}</span>
                <br />
                <a href={`tel:${showPrivacy}`} className="font-display text-lg font-extrabold">{showPrivacy}</a>
              </p>
            )}

            {/* Customer */}
            {actor === "customer" && b.status === "pending_response" && <p className="text-slate">Waiting for {artisan?.name} to respond with a price.</p>}
            {actor === "customer" && can("awaiting_payment") && <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.acceptQuote(b.id))}>Accept quote of {formatNaira(b.quote!.amountKobo)}</Button>}
            {actor === "customer" && b.status === "awaiting_payment" && (
              <>
                <p className="text-slate">Pay {formatNaira(b.quote!.amountKobo)} into a hold. The artisan is not paid until you confirm the job.</p>
                {config.paymentsEnabled ? (
                  <Button className="w-full" variant="gold" disabled={busy} onClick={pay}>Pay {formatNaira(b.quote!.amountKobo)} securely</Button>
                ) : (
                  <p className="rounded-2xl bg-gold-soft p-3 text-sm font-semibold text-[#7a5200]">Online payment is not switched on yet, so this request cannot be paid for. You will be able to pay here as soon as it is.</p>
                )}
              </>
            )}
            {actor === "customer" && b.status === "in_progress" && (
              <>
                <p className="text-slate">{b.artisanMarkedDoneAt ? `${artisan?.name} says the job is done. Check it, then confirm to release payment.` : "Job in progress. You can confirm once the work is done."}</p>
                <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.confirmDone(b.id))}>Confirm job done, release payment</Button>
              </>
            )}
            {actor === "customer" && b.status === "completed" && !review && (
              <div className="space-y-3">
                <h3 className="font-extrabold">Rate this job</h3>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={`h-11 w-11 rounded-full text-xl ${n <= rating ? "bg-gold text-midnight" : "bg-mist text-muted"}`}>★</button>
                  ))}
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} className={inputCls} placeholder="What went well or badly? (optional)" />
                <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.submitReview(b.id, rating, reviewText))}>Submit review</Button>
              </div>
            )}
            {actor === "customer" && b.status === "completed" && review && <p className="text-slate">Thanks, your review is on the artisan’s profile.</p>}

            {/* Artisan */}
            {actor === "artisan" && (b.status === "pending_response" || b.status === "accepted") && (
              <div className="space-y-3">
                <h3 className="font-extrabold">{b.status === "accepted" ? "Revise your quote" : "Send a quote"}</h3>
                <Field label="Price (₦)">
                  <input inputMode="numeric" value={quoteNaira} onChange={(e) => setQuoteNaira(e.target.value.replace(/[^0-9]/g, ""))} className={inputCls} placeholder="12500" />
                </Field>
                {quoteKobo > 0 && <p className="text-sm text-slate">You receive {formatNaira(artisanPayoutKobo(quoteKobo))} after {formatNaira(commissionKobo(quoteKobo))} Sabihand commission.</p>}
                <Field label="What the price covers">
                  <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} rows={3} className={inputCls} placeholder="Parts and labour, how long it takes" />
                </Field>
                <Field label="Date you can come">
                  <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={inputCls} />
                </Field>
                <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.sendQuote(b.id, { naira: Number(quoteNaira), description: quoteText, proposedDate: quoteDate || b.preferredDate }))}>
                  {b.status === "accepted" ? "Send revised quote" : "Send quote"}
                </Button>
              </div>
            )}
            {actor === "artisan" && can("declined") && <Button variant="ghost" className="w-full" disabled={busy} onClick={() => act2(() => actions.declineRequest(b.id))}>Decline request</Button>}
            {actor === "artisan" && b.status === "awaiting_payment" && <p className="text-slate">Quote accepted. Waiting for the customer to pay into the hold.</p>}
            {actor === "artisan" && can("in_progress") && (
              <>
                <p className="text-slate">Payment is held. You can start the job.</p>
                <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.startJob(b.id))}>Start job</Button>
              </>
            )}
            {actor === "artisan" && b.status === "in_progress" && !b.artisanMarkedDoneAt && <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.markDone(b.id))}>Mark job as done</Button>}
            {actor === "artisan" && b.status === "in_progress" && b.artisanMarkedDoneAt && <p className="text-slate">You marked this done. Payment is released when the customer confirms.</p>}

            {/* Admin */}
            {actor === "admin" && b.status === "disputed" && (
              <div className="space-y-3">
                <Field label="Resolution note"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} /></Field>
                <Button className="w-full" disabled={busy} onClick={() => act2(() => actions.resolveDispute(b.id, "release", reason))}>Release payment to artisan</Button>
                <Button variant="danger" className="w-full" disabled={busy} onClick={() => act2(() => actions.resolveDispute(b.id, "refund", reason))}>Refund customer</Button>
              </div>
            )}

            {/* Shared */}
            {(actor === "customer" || actor === "artisan") && (can("cancelled") || can("disputed")) && (
              <div className="space-y-2 border-t border-line pt-4">
                {can("disputed") && (
                  <>
                    <Field label="Report a problem"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls} placeholder="What went wrong?" /></Field>
                    <Button variant="danger" className="w-full" disabled={busy} onClick={() => act2(() => actions.raiseDispute(b.id, reason))}>Report a problem</Button>
                  </>
                )}
                {can("cancelled") && <Button variant="ghost" className="w-full" disabled={busy} onClick={() => act2(() => actions.cancelBooking(b.id))}>Cancel this request{payment?.status === "held" ? " and refund" : ""}</Button>}
              </div>
            )}
            {(["declined", "cancelled", "completed"] as const).includes(b.status as never) && !(actor === "customer" && b.status === "completed" && !review) && <p className="text-slate">This request is closed.</p>}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
