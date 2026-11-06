"use server";

import { sql } from "./db";
import { getViewer } from "./session";

/**
 * Every account on Sabihand, for the admin Users page. Admins only: the check runs here on the server, so nobody
 * else can call these even by hand.
 */

export type UserRole = "artisan" | "customer";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  image?: string;
  createdAt: string;
  banned: boolean;
  /** How they sign in: "google", "email" or both. */
  signIn: string[];
  /** Last time their sign-in was used or refreshed. */
  lastSeen?: string;
  sessions: number;
  role: UserRole;
  admin: "super" | "admin" | null;
  artisan?: { id: string; business: string; trade: string; status: string };
  /** Requests they made as a customer. */
  bookings: number;
  /** Requests they got as an artisan. */
  jobs: number;
  messages: number;
  /** Money they paid in (held or released), in kobo. */
  spentKobo: number;
  /** Money released to them as an artisan, in kobo, before commission. */
  earnedKobo: number;
}

export interface UserEvent {
  at: string;
  kind: "joined" | "signin" | "artisan" | "booking" | "job" | "payment" | "review" | "message" | "admin";
  text: string;
  href?: string;
}

export interface UserSession {
  createdAt: string;
  lastSeen: string;
  expiresAt: string;
  ip?: string;
  device?: string;
  active: boolean;
}

export interface UserDetail {
  user: UserRow;
  sessions: UserSession[];
  events: UserEvent[];
}

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const NOT_ALLOWED = "Only the Sabihand team can see this.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);

type Raw = {
  id: string;
  name: string | null;
  email: string;
  verified: boolean;
  image: string | null;
  created_at: string;
  banned: boolean | null;
  providers: string[] | null;
  last_seen: string | null;
  sessions: string | number;
  artisan: { id: string; business: string; trade: string; status: string } | null;
  bookings: string | number;
  jobs: string | number;
  messages: string | number;
  spent: string | number;
  earned: string | number;
  added_admin: boolean;
};

function rowsQuery(id: string | null) {
  return sql()`
    select u.id::text as id, u.name, u.email, u."emailVerified" as verified, u.image, u."createdAt" as created_at, u.banned,
      (select array_agg(distinct a."providerId") from neon_auth.account a where a."userId" = u.id) as providers,
      (select max(s."updatedAt") from neon_auth.session s where s."userId" = u.id) as last_seen,
      (select count(*) from neon_auth.session s where s."userId" = u.id) as sessions,
      (select json_build_object('id', ar.id, 'business', ar.doc->>'businessName', 'trade', ar.trade, 'status', coalesce(ar.doc->'verification'->>'status', 'unverified'))
         from app.artisans ar where ar.owner_id = u.id::text and ar.id not like 'a_sample_%' order by ar.created_at limit 1) as artisan,
      (select count(*) from app.bookings b where b.customer_id = u.id::text) as bookings,
      (select count(*) from app.bookings b join app.artisans ar on ar.id = b.artisan_id where ar.owner_id = u.id::text) as jobs,
      (select count(*) from app.messages m where m.sender_id = u.id::text) as messages,
      (select coalesce(sum((p.doc->>'amountKobo')::bigint), 0) from app.payments p join app.bookings b on b.id = p.booking_id
         where b.customer_id = u.id::text and p.status in ('held', 'released')) as spent,
      (select coalesce(sum((p.doc->>'amountKobo')::bigint), 0) from app.payments p join app.bookings b on b.id = p.booking_id
         join app.artisans ar on ar.id = b.artisan_id where ar.owner_id = u.id::text and p.status = 'released') as earned,
      exists(select 1 from app.admins ad where ad.user_id = u.id::text) as added_admin
    from neon_auth."user" u
    where ${id}::uuid is null or u.id = ${id}::uuid
    order by u."createdAt" desc
    limit 2000`;
}

function toRow(r: Raw, supers: string[]): UserRow {
  const providers = r.providers ?? [];
  return {
    id: r.id,
    name: r.name || r.email.split("@")[0],
    email: r.email,
    verified: Boolean(r.verified),
    image: typeof r.image === "string" && r.image.startsWith("https://") ? r.image : undefined,
    createdAt: iso(r.created_at)!,
    banned: Boolean(r.banned),
    signIn: providers.map((p) => (p === "credential" ? "email" : p)).sort(),
    lastSeen: iso(r.last_seen),
    sessions: Number(r.sessions),
    role: r.artisan ? "artisan" : "customer",
    admin: supers.includes(r.id.toLowerCase()) ? "super" : r.added_admin ? "admin" : null,
    artisan: r.artisan ?? undefined,
    bookings: Number(r.bookings),
    jobs: Number(r.jobs),
    messages: Number(r.messages),
    spentKobo: Number(r.spent),
    earnedKobo: Number(r.earned),
  };
}

/** All accounts, newest first. */
export async function listUsers(): Promise<{ error: string | null; users: UserRow[] }> {
  const v = await getViewer();
  if (!v?.isAdmin) return { error: NOT_ALLOWED, users: [] };
  try {
    const supers = list(process.env.SUPER_ADMIN_USER_IDS);
    const rows = (await rowsQuery(null)) as Raw[];
    return { error: null, users: rows.map((r) => toRow(r, supers)) };
  } catch (e) {
    console.error("list users failed", e);
    return { error: "Could not load the accounts.", users: [] };
  }
}

/** A short, readable device name from a browser's user agent. */
function device(ua: string | null): string | undefined {
  if (!ua) return undefined;
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const app = /Instagram/.test(ua) ? "Instagram" : /FBAN|FBAV/.test(ua) ? "Facebook" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [app, os].filter(Boolean).join(" on ") || ua.slice(0, 60);
}

const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString("en-NG")}`;

/** One account: details, sign-ins and everything they have done, newest first. */
export async function userDetail(id: string): Promise<{ error: string | null; detail: UserDetail | null }> {
  const v = await getViewer();
  if (!v?.isAdmin) return { error: NOT_ALLOWED, detail: null };
  if (!UUID.test(String(id ?? ""))) return { error: "That account does not exist.", detail: null };
  try {
    const db = sql();
    const supers = list(process.env.SUPER_ADMIN_USER_IDS);
    const rows = (await rowsQuery(id)) as Raw[];
    if (!rows.length) return { error: "That account does not exist.", detail: null };
    const user = toRow(rows[0], supers);

    const [sessions, bookings, jobs, payments, reviews, messages, audit] = (await Promise.all([
      db`select "createdAt" as created_at, "updatedAt" as updated_at, "expiresAt" as expires_at, "ipAddress" as ip, "userAgent" as ua
         from neon_auth.session where "userId" = ${id}::uuid order by "updatedAt" desc limit 50`,
      db`select id, status, doc->>'title' as title, created_at from app.bookings where customer_id = ${id} order by created_at desc limit 100`,
      db`select b.id, b.status, b.doc->>'title' as title, b.doc->>'customerName' as customer, b.created_at
         from app.bookings b join app.artisans ar on ar.id = b.artisan_id where ar.owner_id = ${id} order by b.created_at desc limit 100`,
      db`select p.id, p.status, (p.doc->>'amountKobo')::bigint as amount, p.created_at, b.id as booking_id, b.doc->>'title' as title,
           (b.customer_id = ${id}) as paid_by_them
         from app.payments p join app.bookings b on b.id = p.booking_id left join app.artisans ar on ar.id = b.artisan_id
         where b.customer_id = ${id} or ar.owner_id = ${id} order by p.created_at desc limit 100`,
      db`select r.id, (r.doc->>'rating')::int as rating, r.doc->>'text' as text, r.created_at, r.booking_id
         from app.reviews r join app.bookings b on b.id = r.booking_id where b.customer_id = ${id} order by r.created_at desc limit 100`,
      db`select m.booking_id, count(*) as n, max(m.created_at) as last_at, b.doc->>'title' as title
         from app.messages m left join app.bookings b on b.id = m.booking_id where m.sender_id = ${id}
         group by m.booking_id, b.doc->>'title' order by max(m.created_at) desc limit 50`,
      db`select at, action from app.admin_audit where user_id = ${id} order by at desc limit 50`,
    ])) as [
      { created_at: string; updated_at: string; expires_at: string; ip: string | null; ua: string | null }[],
      { id: string; status: string; title: string | null; created_at: string }[],
      { id: string; status: string; title: string | null; customer: string | null; created_at: string }[],
      { id: string; status: string; amount: string | number; created_at: string; booking_id: string; title: string | null; paid_by_them: boolean }[],
      { id: string; rating: number; text: string | null; created_at: string; booking_id: string }[],
      { booking_id: string; n: string | number; last_at: string; title: string | null }[],
      { at: string; action: string }[],
    ];

    const now = Date.now();
    const events: UserEvent[] = [
      { at: user.createdAt, kind: "joined" as const, text: `Created an account${user.signIn.length ? ` with ${user.signIn.join(" and ")}` : ""}` },
      ...sessions.map((s) => ({ at: iso(s.created_at)!, kind: "signin" as const, text: `Signed in${device(s.ua) ? ` on ${device(s.ua)}` : ""}` })),
      ...(user.artisan ? [{ at: (await db`select created_at from app.artisans where id = ${user.artisan.id}` as { created_at: string }[]).map((r) => iso(r.created_at)!)[0] ?? user.createdAt, kind: "artisan" as const, text: `Set up an artisan profile: ${user.artisan.business}`, href: `/admin/artisans/${user.artisan.id}` }] : []),
      ...bookings.map((b) => ({ at: iso(b.created_at)!, kind: "booking" as const, text: `Requested "${b.title ?? "a job"}" (now ${b.status.replace(/_/g, " ")})`, href: `/admin/requests/${b.id}` })),
      ...jobs.map((b) => ({ at: iso(b.created_at)!, kind: "job" as const, text: `Got a request "${b.title ?? "a job"}" from ${b.customer ?? "a customer"} (now ${b.status.replace(/_/g, " ")})`, href: `/admin/requests/${b.id}` })),
      ...payments.map((p) => ({ at: iso(p.created_at)!, kind: "payment" as const, text: p.paid_by_them ? `Paid ${naira(Number(p.amount))} for "${p.title ?? "a job"}" (${p.status})` : `Was paid ${naira(Number(p.amount))} for "${p.title ?? "a job"}" (${p.status})`, href: `/admin/requests/${p.booking_id}` })),
      ...reviews.map((r) => ({ at: iso(r.created_at)!, kind: "review" as const, text: `Left a ${r.rating}-star review${r.text ? `: "${r.text.slice(0, 80)}"` : ""}`, href: `/admin/requests/${r.booking_id}` })),
      ...messages.map((m) => ({ at: iso(m.last_at)!, kind: "message" as const, text: `Sent ${m.n} chat message${Number(m.n) === 1 ? "" : "s"} on "${m.title ?? "a job"}"`, href: `/admin/requests/${m.booking_id}` })),
      ...audit.map((a) => ({ at: iso(a.at)!, kind: "admin" as const, text: `Admin: ${a.action.replace(/_/g, " ")}` })),
    ].sort((x, y) => y.at.localeCompare(x.at));

    return {
      error: null,
      detail: {
        user,
        sessions: sessions.map((s) => ({
          createdAt: iso(s.created_at)!,
          lastSeen: iso(s.updated_at)!,
          expiresAt: iso(s.expires_at)!,
          ip: s.ip || undefined,
          device: device(s.ua),
          active: new Date(s.expires_at).getTime() > now,
        })),
        events,
      },
    };
  } catch (e) {
    console.error("user detail failed", e);
    return { error: "Could not load this account.", detail: null };
  }
}
