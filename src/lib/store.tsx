"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { AppState, Role } from "./types";
import { initialState, STATE_VERSION } from "./seed";
import type { Ctx } from "./engine";

const KEY = "sabihand.demo.v1";
const SERVER_STATE = initialState();

let current: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  if (typeof window === "undefined") return SERVER_STATE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* storage blocked or corrupt: fall back to seed data */
  }
  return initialState();
}

function getSnapshot(): AppState {
  if (current === null) current = load();
  return current;
}

function set(next: AppState) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore: demo data just will not persist */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function makeCtx(): Ctx {
  return {
    now: new Date().toISOString(),
    id: (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  };
}

interface Api {
  state: AppState;
  /** Run an engine action. Returns an error message, or null on success. */
  run: (fn: (s: AppState, ctx: Ctx) => AppState) => string | null;
  setRole: (r: Role) => void;
  setActiveArtisan: (id: string) => void;
  reset: () => void;
}

const Ctx_ = createContext<Api | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
  const run = useCallback((fn: (s: AppState, ctx: Ctx) => AppState) => {
    try {
      set(fn(getSnapshot(), makeCtx()));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Something went wrong";
    }
  }, []);
  const setRole = useCallback((role: Role) => set({ ...getSnapshot(), role }), []);
  const setActiveArtisan = useCallback((id: string) => set({ ...getSnapshot(), activeArtisanId: id }), []);
  const reset = useCallback(() => set(initialState()), []);
  const api = useMemo(() => ({ state, run, setRole, setActiveArtisan, reset }), [state, run, setRole, setActiveArtisan, reset]);
  return <Ctx_.Provider value={api}>{children}</Ctx_.Provider>;
}

export function useStore(): Api {
  const v = useContext(Ctx_);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
