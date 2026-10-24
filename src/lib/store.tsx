"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AppState, Artisan, Viewer } from "./types";
import { myArtisan } from "./access";

export interface Config {
  paymentsEnabled: boolean;
  /** False when the database could not be reached, so pages can say so instead of showing an empty marketplace. */
  dataAvailable: boolean;
}

interface Api {
  /** Exactly what the signed-in person is allowed to see, loaded on the server for this request. */
  state: AppState;
  viewer: Viewer | null;
  /** The viewer's own artisan profile, if they have one. */
  me: Artisan | null;
  config: Config;
  busy: boolean;
  /** Run a server action. Resolves to an error message for the person, or null on success. */
  act: (fn: () => Promise<{ error: string | null }>) => Promise<string | null>;
}

const Ctx = createContext<Api | null>(null);

export function StoreProvider({ state, viewer, config, children }: { state: AppState; viewer: Viewer | null; config: Config; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const act = useCallback(async (fn: () => Promise<{ error: string | null }>) => {
    setBusy(true);
    try {
      return (await fn()).error;
    } catch {
      return "We could not reach Sabihand. Check your connection and try again.";
    } finally {
      setBusy(false);
    }
  }, []);
  const me = useMemo(() => myArtisan(state.artisans, viewer), [state.artisans, viewer]);
  const api = useMemo(() => ({ state, viewer, me, config, busy, act }), [state, viewer, me, config, busy, act]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
