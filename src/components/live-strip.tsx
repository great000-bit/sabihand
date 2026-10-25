"use client";

import { useStore } from "@/lib/store";
import { areaById } from "@/lib/catalog";

/** Real counts from the database, shown only once there is something true to say. */
export function LiveStrip() {
  const { state } = useStore();
  const total = state.artisans.length;
  if (total === 0) return null;
  const states = new Set(state.artisans.flatMap((a) => a.areaIds.map((id) => areaById(id)?.stateId)).filter(Boolean)).size;
  const verified = state.artisans.filter((a) => a.verification.status === "verified").length;
  return (
    <p className="mt-5 text-sm font-semibold text-muted">
      {total} {total === 1 ? "artisan" : "artisans"} across {states} {states === 1 ? "state" : "states"}
      {verified > 0 && <> · {verified} verified</>}
    </p>
  );
}
