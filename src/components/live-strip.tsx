"use client";

import { useStore } from "@/lib/store";
import { CITIES } from "@/lib/catalog";

/** Real counts from the database, shown only once there is something true to say. */
export function LiveStrip() {
  const { state } = useStore();
  const total = state.artisans.length;
  if (total === 0) return null;
  const verified = state.artisans.filter((a) => a.verification.status === "verified").length;
  return (
    <p className="mt-5 text-sm font-semibold text-[#c9d4ee]">
      {total} {total === 1 ? "artisan" : "artisans"} across {CITIES.length} cities
      {verified > 0 && <> · {verified} verified</>}
    </p>
  );
}
