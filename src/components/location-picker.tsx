"use client";

import { useState } from "react";
import { STATES, areaById, areaLabel, areasInState, stateById } from "@/lib/catalog";
import { inNigeria, nearestArea } from "@/lib/geo";
import type { Area } from "@/lib/types";
import { Button, inputCls } from "./ui";

const PIN = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

/** Asks the browser for the person's position and hands back the nearest area. The position stays on their device. */
export function LocateButton({ onFound, className = "" }: { onFound: (area: Area) => void; className?: string }) {
  const [status, setStatus] = useState<"idle" | "locating">("idle");
  const [error, setError] = useState<string | null>(null);

  function locate() {
    setError(null);
    if (!("geolocation" in navigator)) return setError("This browser cannot share your location. Choose your state and area instead.");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("idle");
        const { latitude, longitude } = pos.coords;
        if (!inNigeria(latitude, longitude)) return setError("Your location looks to be outside Nigeria. Choose your state and area instead.");
        const hit = nearestArea(latitude, longitude);
        if (!hit) return setError("We could not match your location to an area. Choose it from the list.");
        onFound(hit.area);
      },
      (e) => {
        setStatus("idle");
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Location is switched off for this site. Allow it in your browser settings, or choose your state and area."
            : e.code === e.TIMEOUT
              ? "Finding you took too long. Try again, or choose your state and area."
              : "We could not work out where you are. Choose your state and area instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  }

  return (
    <div className={className}>
      <Button type="button" variant="ghost" onClick={locate} disabled={status === "locating"} className="!min-h-10 !px-4 !text-sm">
        {PIN} {status === "locating" ? "Finding you..." : "Use my location"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Pick where: a state, then optionally one local government area in it, or let GPS choose.
 * The value is "" (all of Nigeria), "state:<id>" (a whole state) or an area id.
 */
export function AreaSelect({ value, onChange, id, allLabel = "All of Nigeria" }: { value: string; onChange: (v: string) => void; id?: string; allLabel?: string }) {
  const [gps, setGps] = useState<string | null>(null);
  const stateId = value.startsWith("state:") ? value.slice(6) : value ? (areaById(value)?.stateId ?? "") : "";
  const areas = stateId ? areasInState(stateId) : [];
  const set = (v: string) => {
    setGps(null);
    onChange(v);
  };
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <select id={id} aria-label="State" value={stateId} onChange={(e) => set(e.target.value ? `state:${e.target.value}` : "")} className={inputCls}>
          <option value="">{allLabel}</option>
          {STATES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select aria-label="Local government area" value={value.startsWith("state:") ? "" : value} disabled={!stateId} onChange={(e) => set(e.target.value || `state:${stateId}`)} className={`${inputCls} disabled:opacity-60`}>
          <option value="">{stateId ? `All of ${stateById(stateId)?.name}` : "Choose a state first"}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <LocateButton
        onFound={(a) => {
          onChange(a.id);
          setGps(areaLabel(a.id));
        }}
      />
      {gps && <p className="text-sm font-semibold text-verified">Using your location: {gps}</p>}
    </div>
  );
}
