import type { Booking, BookingEvent, BookingStatus, Role } from "./types";

type Transition = { to: BookingStatus; by: Role[] };

/**
 * Allowed booking transitions (PRD 6.5). Only the listed roles may perform each.
 * "Payment held" and "customer confirms" are driven by actions in engine.ts, not free-form edits.
 */
export const TRANSITIONS: Record<BookingStatus, Transition[]> = {
  pending_response: [
    { to: "accepted", by: ["artisan"] }, // artisan responds with a quote
    { to: "declined", by: ["artisan"] },
    { to: "cancelled", by: ["customer"] },
  ],
  accepted: [
    { to: "accepted", by: ["artisan"] }, // revised quote: customer must accept again
    { to: "awaiting_payment", by: ["customer"] }, // customer accepts the quote
    { to: "declined", by: ["artisan"] },
    { to: "cancelled", by: ["customer"] },
  ],
  awaiting_payment: [
    { to: "confirmed", by: ["customer"] }, // payment held
    { to: "cancelled", by: ["customer", "artisan"] },
  ],
  confirmed: [
    { to: "in_progress", by: ["artisan"] },
    { to: "cancelled", by: ["customer", "artisan"] }, // held payment is refunded
    { to: "disputed", by: ["customer", "artisan"] },
  ],
  in_progress: [
    { to: "completed", by: ["customer"] }, // customer confirms: payout released
    { to: "disputed", by: ["customer", "artisan"] },
  ],
  completed: [{ to: "disputed", by: ["customer"] }],
  declined: [],
  cancelled: [],
  disputed: [
    { to: "completed", by: ["admin"] }, // admin resolves in artisan's favour: payout released
    { to: "cancelled", by: ["admin"] }, // admin resolves for customer: refund
  ],
};

export function canTransition(from: BookingStatus, to: BookingStatus, role: Role): boolean {
  return TRANSITIONS[from].some((t) => t.to === to && t.by.includes(role));
}

export function nextActions(status: BookingStatus, role: Role): BookingStatus[] {
  return TRANSITIONS[status].filter((t) => t.by.includes(role)).map((t) => t.to);
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending_response: "Waiting for artisan",
  accepted: "Quote received",
  declined: "Declined",
  awaiting_payment: "Awaiting payment",
  confirmed: "Booked",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Problem reported",
};

export function isOpen(status: BookingStatus): boolean {
  return !["declined", "completed", "cancelled"].includes(status);
}

export function transition(
  booking: Booking,
  to: BookingStatus,
  role: Role,
  now: string,
  note?: string,
): Booking {
  if (!canTransition(booking.status, to, role)) {
    throw new Error(`${role} cannot move a booking from ${booking.status} to ${to}`);
  }
  const event: BookingEvent = { at: now, actor: role, from: booking.status, to, note };
  return { ...booking, status: to, events: [...booking.events, event] };
}
