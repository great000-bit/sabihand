import { getViewer } from "@/server/session";
import { chatAccess, markRead, messagesAfter, otherSeenSeq, saveMessage } from "@/server/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const HOLD_MS = 9000;
const STEP_MS = 700;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * New messages after `after`. With `wait=1` the request is held open for a few seconds and answers the moment a
 * message (or a "Seen") arrives, so the other person's message shows up within about a second.
 */
export async function GET(req: Request, ctx: { params: Promise<{ bookingId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to chat." }, { status: 401 });
  const { bookingId } = await ctx.params;
  const access = await chatAccess(bookingId, viewer).catch(() => null);
  if (!access) return Response.json({ error: "Chat not found." }, { status: 404 });
  const url = new URL(req.url);
  const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
  const knownSeen = Math.max(0, Number(url.searchParams.get("seen")) || 0);
  const wait = url.searchParams.get("wait") === "1" && after > 0;
  const reading = url.searchParams.get("read") === "1" && access.role !== "admin";
  const deadline = Date.now() + HOLD_MS;
  try {
    for (;;) {
      const [messages, seen] = await Promise.all([messagesAfter(bookingId, after), otherSeenSeq(bookingId, access.otherId)]);
      if (messages.length > 0 || seen !== knownSeen || !wait || Date.now() >= deadline || req.signal.aborted) {
        if (reading && messages.some((m) => m.senderId !== viewer.id)) await markRead(bookingId, viewer.id);
        else if (reading && after === 0) await markRead(bookingId, viewer.id);
        return Response.json({ messages, seen, closed: access.closed, role: access.role });
      }
      await sleep(STEP_MS);
    }
  } catch (e) {
    console.error("chat poll failed", e);
    return Response.json({ error: "Could not load the chat." }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ bookingId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to chat." }, { status: 401 });
  const { bookingId } = await ctx.params;
  const access = await chatAccess(bookingId, viewer).catch(() => null);
  if (!access) return Response.json({ error: "Chat not found." }, { status: 404 });
  if (access.role === "admin") return Response.json({ error: "Admins can read this chat but not write in it." }, { status: 403 });
  if (access.closed) return Response.json({ error: "This chat is closed because the request was declined or cancelled." }, { status: 409 });
  let payload: { body?: unknown; clientId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    const r = await saveMessage(bookingId, viewer.id, payload.body, payload.clientId);
    if ("error" in r) return Response.json({ error: r.error }, { status: 400 });
    await markRead(bookingId, viewer.id);
    return Response.json({ message: r.message });
  } catch (e) {
    console.error("chat send failed", e);
    return Response.json({ error: "Could not send that message. Try again." }, { status: 500 });
  }
}
