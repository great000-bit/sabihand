"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { refreshUnread } from "@/lib/unread";

interface Msg {
  id: string;
  seq: number;
  senderId: string;
  body: string;
  at: string;
  clientId: string | null;
  /** Local only: shown straight away, before the server has confirmed it. */
  state?: "sending" | "failed";
}

const MAX = 2000;

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/**
 * Live chat for one booking. Sending shows the message at once. Receiving uses a request the server holds open for
 * a few seconds and answers the moment something arrives, so replies show up in about a second without a refresh.
 */
export function ChatPanel({ bookingId, viewerId, otherName, readOnlyReason }: { bookingId: string; viewerId: string; otherName: string; readOnlyReason?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [seen, setSeen] = useState(0);
  const [closed, setClosed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const cursor = useRef(0);
  const seenRef = useRef(0);

  const merge = useCallback((incoming: Msg[]) => {
    setMsgs((cur) => {
      const byClient = new Map(incoming.filter((m) => m.clientId).map((m) => [m.clientId!, m]));
      const known = new Set(cur.filter((m) => !m.state).map((m) => m.id));
      const kept = cur.filter((m) => !(m.state === "sending" && m.clientId && byClient.has(m.clientId)));
      const fresh = incoming.filter((m) => !known.has(m.id));
      return [...kept.filter((m) => !m.state), ...fresh, ...kept.filter((m) => m.state)].sort((a, b) => (a.state ? 1 : 0) - (b.state ? 1 : 0) || a.seq - b.seq);
    });
    for (const m of incoming) cursor.current = Math.max(cursor.current, m.seq);
  }, []);

  useEffect(() => {
    let stopped = false;
    const ctl = new AbortController();
    (async () => {
      let backoff = 0;
      while (!stopped) {
        if (document.visibilityState === "hidden") {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        const first = cursor.current === 0 && !loaded;
        try {
          const q = new URLSearchParams({ after: String(cursor.current), seen: String(seenRef.current), read: "1" });
          if (cursor.current > 0) q.set("wait", "1");
          const res = await fetch(`/api/chat/${encodeURIComponent(bookingId)}?${q}`, { cache: "no-store", signal: ctl.signal });
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string };
            if (res.status === 401 || res.status === 404) return setError(j.error ?? "Chat not available.");
            throw new Error(j.error);
          }
          const j = (await res.json()) as { messages: Msg[]; seen: number; closed: boolean };
          backoff = 0;
          setError(null);
          setClosed(j.closed);
          seenRef.current = j.seen;
          setSeen(j.seen);
          if (j.messages.length > 0) {
            merge(j.messages);
            if (j.messages.some((m) => m.senderId !== viewerId)) refreshUnread();
          }
          if (first) setLoaded(true);
        } catch {
          if (stopped) return;
          backoff = Math.min(backoff ? backoff * 2 : 1000, 10000);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    })();
    return () => {
      stopped = true;
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, viewerId, merge]);

  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function deliver(m: Msg) {
    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(bookingId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: m.body, clientId: m.clientId }) });
      const j = (await res.json().catch(() => ({}))) as { message?: Msg; error?: string };
      if (!res.ok || !j.message) {
        setError(j.error ?? "Could not send that message.");
        return setMsgs((cur) => cur.map((x) => (x.clientId === m.clientId && x.state ? { ...x, state: "failed" } : x)));
      }
      setError(null);
      merge([j.message]);
    } catch {
      setMsgs((cur) => cur.map((x) => (x.clientId === m.clientId && x.state ? { ...x, state: "failed" } : x)));
    }
  }

  function send() {
    const body = text.trim();
    if (!body || body.length > MAX) return;
    const clientId = crypto.randomUUID();
    const m: Msg = { id: `local-${clientId}`, seq: Number.MAX_SAFE_INTEGER, senderId: viewerId, body, at: new Date().toISOString(), clientId, state: "sending" };
    stick.current = true;
    setMsgs((cur) => [...cur, m]);
    setText("");
    void deliver(m);
  }

  function retry(m: Msg) {
    setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, state: "sending" } : x)));
    void deliver(m);
  }

  const lastMine = [...msgs].reverse().find((m) => m.senderId === viewerId && !m.state);
  const disabled = Boolean(readOnlyReason) || closed;

  return (
    <section aria-label={`Chat with ${otherName}`} className="overflow-hidden rounded-3xl border border-line bg-surface backdrop-blur-xl">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold">Chat with {otherName}</h2>
          <p className="text-xs text-muted">Keep chats and payments on Sabihand so you stay protected.</p>
        </div>
        <span className="inline-flex flex-none items-center gap-1.5 text-xs font-bold text-verified">
          <span aria-hidden className="h-2 w-2 rounded-full bg-verified" /> Live
        </span>
      </header>

      <div
        ref={box}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        className="flex h-80 flex-col gap-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
      >
        {!loaded && !error && <p className="m-auto text-sm text-muted">Loading messages...</p>}
        {loaded && msgs.length === 0 && <p className="m-auto max-w-xs text-center text-sm text-muted">No messages yet. Say hello and agree the details of the job here.</p>}
        {msgs.map((m, i) => {
          const mine = m.senderId === viewerId;
          const prev = msgs[i - 1];
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
          const grouped = prev && !newDay && prev.senderId === m.senderId;
          return (
            <div key={m.id} className={grouped ? "" : "mt-2"}>
              {newDay && <p className="my-2 text-center text-xs font-bold uppercase tracking-wide text-muted">{dayLabel(m.at)}</p>}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${mine ? "rounded-br-md bg-gold text-midnight" : "rounded-bl-md bg-white/10 text-ink"} ${m.state === "sending" ? "opacity-70" : ""}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[11px] ${mine ? "text-midnight/60" : "text-muted"}`}>
                    {m.state === "sending" ? "Sending..." : m.state === "failed" ? "Not sent" : clock(m.at)}
                  </p>
                </div>
              </div>
              {m.state === "failed" && (
                <p className="mt-1 text-right text-xs font-bold text-alert">
                  Could not send. <button type="button" onClick={() => retry(m)} className="underline">Tap to retry</button>
                </p>
              )}
              {lastMine?.id === m.id && !readOnlyReason && (
                <p className="mt-0.5 text-right text-[11px] font-semibold text-muted">{seen >= m.seq ? "Seen" : "Delivered"}</p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p role="alert" className="border-t border-line bg-alert-soft px-5 py-2 text-sm font-semibold text-alert">{error}</p>}

      {disabled ? (
        <p className="border-t border-line px-5 py-4 text-sm text-slate">{readOnlyReason ?? "This chat is closed because the request was declined or cancelled."}</p>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={MAX}
            placeholder="Write a message"
            aria-label="Message"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border-2 border-line bg-surface px-4 py-2.5 text-[16px] text-ink placeholder:text-muted focus:border-trust"
          />
          <button type="submit" disabled={!text.trim()} className="inline-flex min-h-11 flex-none items-center justify-center rounded-full bg-gold px-5 text-[15px] font-extrabold text-midnight transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50">
            Send
          </button>
        </form>
      )}
    </section>
  );
}

/** A small count for the menu and request lists. */
export function UnreadPill({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span aria-label={`${n} unread ${n === 1 ? "message" : "messages"}`} className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-extrabold leading-5 text-midnight">
      {n > 9 ? "9+" : n}
    </span>
  );
}
