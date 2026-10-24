# Sabihand build plan

Status: real product, no demo data. Updated 2026-10-24 for the team (Faith, Emman-Wori, Osose, Destiny).

## What exists

Everyone has a real account (Neon Auth, email and password). The whole PRD loop runs on a real database:
an artisan creates a profile, a customer requests a quote, the artisan quotes, the customer accepts and pays through
Paystack into a hold, the artisan does the job, the customer confirms, the payment is released minus commission,
the customer reviews. The Sabihand team verifies artisans and resolves disputes from `/admin`.

How it is built:

- `src/lib/engine.ts`: every rule, as pure functions that also check who is acting. Covered by tests (`engine.test.ts`).
- `src/server/actions.ts`: server actions. Each loads the data, runs one engine function as the signed-in person, and saves only what changed.
- `src/server/repo.ts`: Neon tables in schema `app` (one JSON document per object plus the columns we filter on) and `visibleTo`, which decides what each person is sent. Phone numbers stay private until a booking is paid.
- `src/server/paystack.ts`, `payments.ts`, `/pay/callback`, `/api/paystack/webhook`: checkout, then the payment is recorded only after Paystack confirms it. Safe if both callback and webhook arrive.
- No sample data exists anywhere. The marketplace is empty until real artisans sign up.

Writes are safe under concurrency: every row has a version, an update names the version it read, and a stale write
rolls back and is replayed on fresh data (`persist` in `src/server/repo.ts`, migration `0003_versions.sql`).

Payouts are manual for now: artisans save a bank account, the admin page lists released jobs with the amount owed and
the account, and the team records the transfer reference after sending the money. No automated bank transfers yet.

Known limits (honest list): there is no photo upload, notifications, or terms and privacy pages yet.

## Defaults I picked (change any of them)

| Decision | Default | Where |
| --- | --- | --- |
| Launch | Lagos, Abuja and Port Harcourt (Rivers State), city by city; first areas near universities (Akoka, Gwagwalada, Choba) | `src/lib/catalog.ts` |
| Trades | Plumber, electrician, tailor, carpenter | `src/lib/catalog.ts` |
| Commission | 10% of the job, taken from the artisan payout | `COMMISSION_BPS` in `src/lib/money.ts` |
| Payment | Paystack (card checkout). Needs `PAYSTACK_SECRET_KEY` | `src/server/paystack.ts`, `recordPayment` in engine |
| Money | Integer kobo, never floats | `money.ts` |
| Ratings | Only from a completed booking, one per booking. No fake reviews | `reviews.ts` |
| Verification | A badge only lists checks that were actually done | `submitVerification`, `decideVerification` |
| Unverified artisans | Shown, labelled, ranked after verified | `search.ts` |

Note: the PRD says campus pilot and lists nationwide as a non-goal, while the team decision (2026-10-18) was a
Nigeria-wide launch. The build supports both: areas are data, so a campus-only pilot is just fewer areas.

## Decisions needed from the team

1. Payment provider and who holds the funds (Paystack escrow-style flow needs a business account).
2. Commission percentage (10% is an assumption from the deck, not validated).
3. Launch cities and the first neighbourhoods.
4. What evidence counts for ID and address verification, and how it is stored (NDPA data-protection duties apply).
5. Dispute policy: how long an artisan or customer has to respond, and refund rules.

## Next steps

1. Onboard the first real artisans (the ~10 who said yes) and verify them from `/admin`.
2. Paystack test key on Vercel, then a live key after the business account is verified. Set the webhook URL.
3. Automate payouts through Paystack Transfers (bank details and a manual payout tracker already exist).
4. Terms of service and privacy policy (needed before taking real money; NDPA applies). Needs a lawyer's review.
5. Photo upload for portfolios (Vercel Blob or Cloudflare R2).
6. Notifications (WhatsApp or SMS) when a request or quote arrives.
7. Drop the unused `public.*` tables from `db/migrations/0001_init.sql` (needs the owner's OK).

## Run it

```
npm install
npm run dev      # http://localhost:3000
npm test         # engine and privacy tests
npm run typecheck && npm run lint && npm run build
```
