"use client";

import { useStore } from "@/lib/store";
import { areaById } from "@/lib/catalog";

/** Real counts from the database (sample profiles are left out), shown only once there is something true to say. */
export function LiveStrip() {
  const { state } = useStore();
  const real = state.artisans.filter((a) => !a.sample);
  const total = real.length;
  if (total === 0) return null;
  const states = new Set(real.flatMap((a) => a.areaIds.map((id) => areaById(id)?.stateId)).filter(Boolean)).size;
  const verified = real.filter((a) => a.verification.status === "verified").length;
  return (
    <p className="mt-5 text-sm font-semibold text-muted">
      {total} {total === 1 ? "artisan" : "artisans"} across {states} {states === 1 ? "state" : "states"}
      {verified > 0 && <> · {verified} verified</>}
    </p>
  );
}
