import type { Viewer } from "@/lib/types";
import { sql } from "./db";
import { newId } from "./ids";

export const MAX_MESSAGE_LENGTH = 2000;
const PER_MINUTE = 30;

export interface ChatMessage {
  id: string;
  seq: number;
  senderId: string;
  body: string;
  at: string;
  clientId: string | null;
}

export interface ChatAccess {
  role: "customer" | "artisan" | "admin";
  /** The other person in the chat, whose read position drives "Seen". */
  otherId: string;
  /** Closed once a request is declined or cancelled; the history stays readable. */
  closed: boolean;
}

/** Who this person is on the booking, or null when it is not theirs. Admins can read, never write. */
export async function chatAccess(bookingId: string, viewer: Viewer): Promise<ChatAccess | null> {
  if (!/^[\w-]{1,64}$/.test(bookingId)) return null;
  const r = (await sql()`select b.customer_id, a.owner_id, b.status from app.bookings b join app.artisans a on a.id = b.artisan_id where b.id = ${bookingId}`) as { customer_id: string; owner_id: string; status: string }[];
  const row = r[0];
  if (!row) return null;
  const closed = row.status === "declined" || row.status === "cancelled";
  if (row.customer_id === viewer.id) return { role: "customer", otherId: row.owner_id, closed };
  if (row.owner_id === viewer.id) return { role: "artisan", otherId: row.customer_id, closed };
  if (viewer.isAdmin) return { role: "admin", otherId: row.customer_id, closed: true };
  return null;
}

const toMessage = (r: { id: string; seq: string | number; sender_id: string; body: string; created_at: string | Date; client_id: string | null }): ChatMessage => ({
  id: r.id,
  seq: Number(r.seq),
  senderId: r.sender_id,
  body: r.body,
  at: new Date(r.created_at).toISOString(),
  clientId: r.client_id,
});

type Row = Parameters<typeof toMessage>[0];

/** Messages after a cursor, oldest first. With no cursor, the latest 100. */
export async function messagesAfter(bookingId: string, after: number): Promise<ChatMessage[]> {
  const db = sql();
  const rows = (after > 0
    ? await db`select id, seq, sender_id, body, created_at, client_id from app.messages where booking_id = ${bookingId} and seq > ${after} order by seq asc limit 100`
    : await db`select * from (select id, seq, sender_id, body, created_at, client_id from app.messages where booking_id = ${bookingId} order by seq desc limit 100) t order by seq asc`) as Row[];
  return rows.map(toMessage);
}

export async function otherSeenSeq(bookingId: string, otherId: string): Promise<number> {
  const r = (await sql()`select last_seq from app.chat_reads where booking_id = ${bookingId} and user_id = ${otherId}`) as { last_seq: string }[];
  return r[0] ? Number(r[0].last_seq) : 0;
}

/** Marks everything in the chat as read by this person. Only moves forward. */
export async function markRead(bookingId: string, userId: string): Promise<void> {
  await sql()`insert into app.chat_reads (booking_id, user_id, last_seq) values (${bookingId}, ${userId}, coalesce((select max(seq) from app.messages where booking_id = ${bookingId}), 0))
    on conflict (booking_id, user_id) do update set last_seq = greatest(app.chat_reads.last_seq, excluded.last_seq), updated_at = now()`;
}

/**
 * Saves one message. Sending the same clientId again returns the saved message instead of a duplicate,
 * so a retry after a dropped connection is safe.
 */
export async function saveMessage(bookingId: string, senderId: string, bodyRaw: unknown, clientIdRaw: unknown): Promise<{ error: string } | { message: ChatMessage }> {
  const body = typeof bodyRaw === "string" ? bodyRaw.trim() : "";
  if (!body) return { error: "Type a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) return { error: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.` };
  const clientId = typeof clientIdRaw === "string" && /^[\w-]{8,64}$/.test(clientIdRaw) ? clientIdRaw : null;
  const db = sql();
  const recent = (await db`select count(*)::int as n from app.messages where sender_id = ${senderId} and created_at > now() - interval '1 minute'`) as { n: number }[];
  if ((recent[0]?.n ?? 0) >= PER_MINUTE) return { error: "You are sending messages very fast. Wait a moment and try again." };
  const inserted = (await db`insert into app.messages (id, booking_id, sender_id, body, client_id) values (${newId("m")}, ${bookingId}, ${senderId}, ${body}, ${clientId})
    on conflict (sender_id, client_id) do nothing returning id, seq, sender_id, body, created_at, client_id`) as Row[];
  if (inserted[0]) return { message: toMessage(inserted[0]) };
  const existing = (await db`select id, seq, sender_id, body, created_at, client_id from app.messages where sender_id = ${senderId} and client_id = ${clientId}`) as Row[];
  return existing[0] ? { message: toMessage(existing[0]) } : { error: "Could not send that message." };
}

/** Unread messages per chat for this person, from people they are chatting with. */
export async function unreadByBooking(userId: string): Promise<Record<string, number>> {
  const rows = (await sql()`select m.booking_id, count(*)::int as n
    from app.messages m
    join app.bookings b on b.id = m.booking_id
    join app.artisans a on a.id = b.artisan_id
    left join app.chat_reads r on r.booking_id = m.booking_id and r.user_id = ${userId}
    where (b.customer_id = ${userId} or a.owner_id = ${userId}) and m.sender_id <> ${userId} and m.seq > coalesce(r.last_seq, 0)
    group by m.booking_id`) as { booking_id: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.booking_id, r.n]));
}
