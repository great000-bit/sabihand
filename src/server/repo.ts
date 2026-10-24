import type { AppState, Artisan, Booking, Payment, Report, Review, Viewer } from "@/lib/types";
import { sql } from "./db";

const rows = (r: unknown) => r as { doc: unknown; version: number }[];

/** A loaded copy of everything, with the version of each row so a later write can detect that someone else wrote first. */
export interface Snapshot {
  state: AppState;
  versions: Record<string, number>;
}

/** Thrown when another request changed a row between our read and our write. Callers reload and try again. */
export class ConflictError extends Error {
  constructor() {
    super("Someone else changed this at the same moment.");
  }
}

/** Everything, unredacted. Server-side only; never send this to a browser. */
export async function loadAll(): Promise<Snapshot> {
  const db = sql();
  const [artisans, bookings, payments, reviews, reports] = await Promise.all([
    db`select doc, version from app.artisans order by created_at asc`,
    db`select doc, version from app.bookings order by created_at desc`,
    db`select doc, version from app.payments order by created_at asc`,
    db`select doc, version from app.reviews order by created_at desc`,
    db`select doc, version from app.reports order by created_at desc`,
  ]);
  const versions: Record<string, number> = {};
  const take = <T extends { id: string }>(table: string, list: unknown): T[] =>
    rows(list).map((r) => {
      const d = r.doc as T;
      versions[`${table}:${d.id}`] = r.version;
      return d;
    });
  const state: AppState = {
    artisans: take<Artisan>("artisans", artisans),
    bookings: take<Booking>("bookings", bookings),
    payments: take<Payment>("payments", payments),
    reviews: take<Review>("reviews", reviews),
    reports: take<Report>("reports", reports),
  };
  return { state, versions };
}

function changed<T extends { id: string }>(before: T[], after: T[]): T[] {
  const old = new Map(before.map((x) => [x.id, JSON.stringify(x)]));
  return after.filter((x) => old.get(x.id) !== JSON.stringify(x));
}

/**
 * Writes only the documents that differ, in one transaction. An update names the version it read; if the row has
 * moved on, the statement raises a division by zero, the whole transaction rolls back, and we report a conflict.
 */
export async function persist(before: Snapshot, after: AppState): Promise<void> {
  const db = sql();
  const v = (table: string, id: string) => before.versions[`${table}:${id}`];
  const q = [
    ...changed(before.state.artisans, after.artisans).map((a) =>
      v("artisans", a.id) === undefined
        ? db`insert into app.artisans (id, owner_id, trade, status, area_ids, doc) values (${a.id}, ${a.ownerId}, ${a.trade}, ${a.verification.status}, ${a.areaIds}, ${JSON.stringify(a)}::jsonb)`
        : db`with u as (update app.artisans set status = ${a.verification.status}, area_ids = ${a.areaIds}, doc = ${JSON.stringify(a)}::jsonb, version = version + 1, updated_at = now() where id = ${a.id} and version = ${v("artisans", a.id)} returning 1) select 1 / count(*) from u`,
    ),
    ...changed(before.state.bookings, after.bookings).map((b) =>
      v("bookings", b.id) === undefined
        ? db`insert into app.bookings (id, customer_id, artisan_id, status, doc) values (${b.id}, ${b.customerId}, ${b.artisanId}, ${b.status}, ${JSON.stringify(b)}::jsonb)`
        : db`with u as (update app.bookings set status = ${b.status}, doc = ${JSON.stringify(b)}::jsonb, version = version + 1, updated_at = now() where id = ${b.id} and version = ${v("bookings", b.id)} returning 1) select 1 / count(*) from u`,
    ),
    ...changed(before.state.payments, after.payments).map((p) =>
      v("payments", p.id) === undefined
        ? db`insert into app.payments (id, booking_id, status, provider, provider_ref, doc) values (${p.id}, ${p.bookingId}, ${p.status}, ${p.provider}, ${p.providerRef}, ${JSON.stringify(p)}::jsonb)`
        : db`with u as (update app.payments set status = ${p.status}, doc = ${JSON.stringify(p)}::jsonb, version = version + 1, updated_at = now() where id = ${p.id} and version = ${v("payments", p.id)} returning 1) select 1 / count(*) from u`,
    ),
    ...changed(before.state.reviews, after.reviews).map((r) =>
      v("reviews", r.id) === undefined
        ? db`insert into app.reviews (id, booking_id, artisan_id, doc) values (${r.id}, ${r.bookingId}, ${r.artisanId}, ${JSON.stringify(r)}::jsonb)`
        : db`with u as (update app.reviews set doc = ${JSON.stringify(r)}::jsonb, version = version + 1 where id = ${r.id} and version = ${v("reviews", r.id)} returning 1) select 1 / count(*) from u`,
    ),
    ...changed(before.state.reports, after.reports).map((r) =>
      v("reports", r.id) === undefined
        ? db`insert into app.reports (id, doc, resolved) values (${r.id}, ${JSON.stringify(r)}::jsonb, ${Boolean(r.resolvedAt)})`
        : db`with u as (update app.reports set doc = ${JSON.stringify(r)}::jsonb, resolved = ${Boolean(r.resolvedAt)}, version = version + 1 where id = ${r.id} and version = ${v("reports", r.id)} returning 1) select 1 / count(*) from u`,
    ),
  ];
  if (q.length === 0) return;
  try {
    await db.transaction(q);
  } catch (e) {
    if ((e as { code?: string }).code === "22012" || /division by zero/i.test(String((e as Error).message))) throw new ConflictError();
    throw e;
  }
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
        bank: full ? a.bank : undefined,
        verification: full ? a.verification : { ...a.verification, note: undefined },
      };
    }),
    bookings: bookings.map((b) => (admin || (viewer && b.customerId === viewer.id) || paid.has(b.id) ? b : { ...b, customerPhone: "" })),
    payments,
    reviews: admin ? all.reviews : all.reviews.filter((r) => !r.hidden),
    reports: admin ? all.reports : [],
  };
}
