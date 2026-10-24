// Core domain types. Money is always an integer number of kobo (₦1 = 100 kobo).

export type Trade = "plumbing" | "electrical" | "tailoring" | "carpentry";
export type City = "Lagos" | "Abuja" | "Port Harcourt";
export type Role = "customer" | "artisan" | "admin";

export interface Area {
  id: string;
  city: City;
  name: string;
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
  portfolio: { id: string; caption: string }[];
  verification: Verification;
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
  isAdmin: boolean;
}

export interface AppState {
  artisans: Artisan[];
  bookings: Booking[];
  payments: Payment[];
  reviews: Review[];
  reports: Report[];
}
