// Core domain types. Money is always an integer number of kobo (₦1 = 100 kobo).

export type Trade = "plumbing" | "electrical" | "tailoring" | "carpentry" | "mechanic" | "hairdressing" | "painting" | "welding";
export type Role = "customer" | "artisan" | "admin";

/** A place an artisan can serve and a customer can book in: a local government area, or a named neighbourhood inside one. */
export interface Area {
  id: string;
  /** Id of the state (or "fct") the area is in, see STATES in catalog.ts. */
  stateId: string;
  name: string;
  /** Centre point, used by the GPS button to find the nearest area. */
  lat: number;
  lng: number;
}

export type VerificationCheck = "phone" | "id" | "address" | "guarantor";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

export interface Verification {
  status: VerificationStatus;
  /** Only checks the admin actually performed. Never show a check that is not in this list. */
  checks: VerificationCheck[];
  submittedAt?: string;
  decidedAt?: string;
  note?: string;
}

export interface ServicePrice {
  title: string;
  minKobo: number;
  /** null = quotation required, only the minimum is an indicative "from" price. */
  maxKobo: number | null;
}

export interface BankDetails {
  bankName: string;
  /** 10-digit NUBAN account number. */
  accountNumber: string;
  accountName: string;
  /** Paystack bank code, when the bank was picked from the live list. */
  bankCode?: string;
  /** True when the account name came from the bank's own record, not from what the artisan typed. */
  verified?: boolean;
}

export interface Artisan {
  id: string;
  name: string;
  businessName: string;
  trade: Trade;
  areaIds: string[];
  bio: string;
  availability: string;
  services: ServicePrice[];
  /** Id of the profile photo in app.images, served at /api/images/<id>. */
  photoId?: string;
  /** Photos of past work, newest last. */
  portfolio: { id: string; caption: string; imageId: string }[];
  verification: Verification;
  /** A demonstration profile, not a real business. It cannot be booked. */
  sample?: boolean;
  joinedAt: string;
  /** Id of the signed-in user who owns this profile. */
  ownerId: string;
  /** Private. Where released earnings are paid. Only the owner and the Sabihand team ever receive it. */
  bank?: BankDetails;
  /** Private contact number. Stripped from what other people receive until a booking is paid. */
  phone: string;
}

export type BookingStatus =
  | "pending_response"
  | "accepted"
  | "declined"
  | "awaiting_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface Quote {
  amountKobo: number;
  description: string;
  proposedDate: string;
  sentAt: string;
}

export interface BookingEvent {
  at: string;
  actor: Role;
  from: BookingStatus | null;
  to: BookingStatus;
  note?: string;
}

export interface Booking {
  id: string;
  artisanId: string;
  customerId: string;
  customerName: string;
  /** Private. Only the artisan sees it, and only once the booking is paid. */
  customerPhone: string;
  trade: Trade;
  areaId: string;
  title: string;
  description: string;
  preferredDate: string;
  status: BookingStatus;
  quote?: Quote;
  artisanMarkedDoneAt?: string;
  createdAt: string;
  events: BookingEvent[];
}

export type PaymentStatus = "held" | "released" | "refunded";

export interface Payment {
  id: string;
  bookingId: string;
  amountKobo: number;
  commissionKobo: number;
  status: PaymentStatus;
  provider: "paystack";
  /** Paystack transaction reference; unique, so a payment can only be recorded once. */
  providerRef: string;
  createdAt: string;
  settledAt?: string;
  /** Set by the Sabihand team once the artisan's share has been sent to their bank. */
  payout?: { paidAt: string; reference: string };
}

export interface Review {
  id: string;
  bookingId: string;
  artisanId: string;
  customerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
  hidden?: boolean;
}

export interface Report {
  id: string;
  kind: "booking" | "review" | "artisan";
  targetId: string;
  reason: string;
  reporterName: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

/** The signed-in person making a request. Resolved on the server from the session, never from the client. */
export interface Viewer {
  id: string;
  name: string;
  email: string;
  /** Profile picture from the Google account, when Google shares one. https only. */
  image?: string;
  isAdmin: boolean;
  /** Can make other people admins. Named in SUPER_ADMIN_USER_IDS; always also an admin. */
  isSuperAdmin?: boolean;
}

export interface AppState {
  artisans: Artisan[];
  bookings: Booking[];
  payments: Payment[];
  reviews: Review[];
  reports: Report[];
}
