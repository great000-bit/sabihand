import type { AppState, Booking, Role, Viewer } from "./types";

/** Which side of a booking the signed-in person is on. Pure, so the server and the UI always agree. */
export function actorOn(state: Pick<AppState, "artisans">, b: Booking, user: Viewer | null): Role | null {
  if (!user) return null;
  if (b.customerId === user.id) return "customer";
  if (state.artisans.find((a) => a.id === b.artisanId)?.ownerId === user.id) return "artisan";
  if (user.isAdmin) return "admin";
  return null;
}

export function myArtisan<T extends { ownerId: string }>(artisans: T[], user: Viewer | null): T | null {
  return user ? (artisans.find((a) => a.ownerId === user.id) ?? null) : null;
}
