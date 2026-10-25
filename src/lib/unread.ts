"use client";

import { useSyncExternalStore } from "react";

type Snapshot = { byBooking: Record<string, number>; total: number };
const EMPTY: Snapshot = { byBooking: {}, total: 0 };

let snap: Snapshot = EMPTY;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  try {
    const r = await fetch("/api/chat/unread", { cache: "no-store" });
    if (!r.ok) return;
    const next = (await r.json()) as Snapshot;
    if (next.total !== snap.total || JSON.stringify(next.byBooking) !== JSON.stringify(snap.byBooking)) {
      snap = next;
      subs.forEach((f) => f());
    }
  } catch {
    /* offline: keep the last numbers */
  }
}

/** Tell every badge to re-check now, for example right after reading a chat. */
export function refreshUnread() {
  void refresh();
}

function subscribe(f: () => void) {
  subs.add(f);
  if (!timer) {
    void refresh();
    timer = setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
  }
  return () => {
    subs.delete(f);
    if (subs.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}

export function useUnread(): Snapshot {
  return useSyncExternalStore(subscribe, () => snap, () => EMPTY);
}
