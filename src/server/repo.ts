import type { AppState, Artisan, Booking, Payment, Report, Review, Viewer } from "@/lib/types";
import { sql } from "./db";

const docs = <T>(rows: unknown) => (rows as { doc: unknown }[]).map((r) => r.doc as T);

/** Everything, unredacted. Server-side only; never send this to a browser. */
export async function loadAll(): Promise<AppState> {
  const db = sql();
  const [artisans, bookings, payments, reviews, reports] = await Promise.all([
    db`select doc from app.artisans order by created_at asc`,
    db`select doc from app.bookings order by created_at desc`,
    db`select doc from app.payments order by created_at asc`,
    db`select doc from app.reviews order by created_at desc`,
    db`select doc from app.reports order by created_at desc`,
  ]);
  return {
    artisans: docs<Artisan>(artisans),
    bookings: docs<Booking>(bookings),
    payments: docs<Payment>(payments),
    reviews: docs<Review>(reviews),
    reports: docs<Report>(reports),
  };
}

function changed<T extends { id: string }>(before: T[], after: T[]): T[] {
  const old = new Map(before.map((x) => [x.id, JSON.stringify(x)]));
  return after.filter((x) => old.get(x.id) !== JSON.stringify(x));
}

/** Writes only the documents that differ, in one transaction. */
export async function persist(before: AppState, after: AppState): Promise<void> {
  const db = sql();
  const q = [
    ...changed(before.artisans, after.artisans).map(
      (a) => db`insert into app.artisans (id, owner_id, trade, status, area_ids, doc)
        values (${a.id}, ${a.ownerId}, ${a.trade}, ${a.verification.status}, ${a.areaIds}, ${JSON.stringify(a)}::jsonb)
        on conflict (id) do update set status = excluded.status, area_ids = excluded.area_ids, doc = excluded.doc, updated_at = now()`,
    ),
    ...changed(before.bookings, after.bookings).map(
      (b) => db`insert into app.bookings (id, customer_id, artisan_id, status, doc)
        values (${b.id}, ${b.customerId}, ${b.artisanId}, ${b.status}, ${JSON.stringify(b)}::jsonb)
        on conflict (id) do update set status = excluded.status, doc = excluded.doc, updated_at = now()`,
    ),
    ...changed(before.payments, after.payments).map(
      (p) => db`insert into app.payments (id, booking_id, status, provider, provider_ref, doc)
        values (${p.id}, ${p.bookingId}, ${p.status}, ${p.provider}, ${p.providerRef}, ${JSON.stringify(p)}::jsonb)
        on conflict (id) do update set status = excluded.status, doc = excluded.doc, updated_at = now()`,
    ),
    ...changed(before.reviews, after.reviews).map(
      (r) => db`insert into app.reviews (id, booking_id, artisan_id, doc)
        values (${r.id}, ${r.bookingId}, ${r.artisanId}, ${JSON.stringify(r)}::jsonb)
        on conflict (id) do update set doc = excluded.doc`,
    ),
    ...changed(before.reports, after.reports).map(
      (r) => db`insert into app.reports (id, doc, resolved)
        values (${r.id}, ${JSON.stringify(r)}::jsonb, ${Boolean(r.resolvedAt)})
        on conflict (id) do update set doc = excluded.doc, resolved = excluded.resolved`,
    ),
  ];
  if (q.length) await db.transaction(q);
}

/**
 * What one person is allowed to receive. Phone numbers are private until a booking is paid; hidden reviews,
 * other people's bookings, reports and rejection notes never leave the server.
 */
export function visibleTo(all: AppState, viewer: Viewer | null): AppState {
  const admin = viewer?.isAdmin === true;
  const mine = new Set(all.artisans.filter((a) => viewer && a.ownerId === viewer.id).map((a) => a.id));
  const bookings = all.bookings.filter((b) => admin || (viewer && b.customerId === viewer.id) || mine.has(b.artisanId));
  const paid = new Set(all.payments.map((p) => p.bookingId));
  const payments = all.payments.filter((p) => bookings.some((b) => b.id === p.bookingId));
  const phoneOf = new Set(bookings.filter((b) => paid.has(b.id) && viewer && b.customerId === viewer.id).map((b) => b.artisanId));
  return {
    artisans: all.artisans.map((a) => {
      const own = mine.has(a.id);
      const full = admin || own;
      return {
        ...a,
        ownerId: own ? a.ownerId : "",
        phone: full || phoneOf.has(a.id) ? a.phone : "",
        verification: full ? a.verification : { ...a.verification, note: undefined },
      };
    }),
    bookings: bookings.map((b) => (admin || (viewer && b.customerId === viewer.id) || paid.has(b.id) ? b : { ...b, customerPhone: "" })),
    payments,
    reviews: admin ? all.reviews : all.reviews.filter((r) => !r.hidden),
    reports: admin ? all.reports : [],
  };
}
