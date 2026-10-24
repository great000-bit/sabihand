# Sabihand build plan

Status: foundation done (demo mode). Written 2026-10-24 for the team (Faith, Emman-Wori, Osose, Destiny).

## What exists

A mobile-first Next.js app that runs the whole PRD loop with sample data and a pretend payment:
find an artisan, request a quote, artisan quotes, customer accepts and pays into a hold, artisan does the job,
customer confirms, money is released minus commission, customer reviews. Admin verifies artisans and resolves disputes.

Switch roles in the header ("Viewing as"). "Reset demo" restores the seed data. State lives in the browser (localStorage).

All the rules live in `src/lib/engine.ts` (pure functions, 12 tests in `engine.test.ts`). The UI only calls them,
so moving to a real backend means re-implementing the same functions on the server, not rewriting screens.

## Defaults I picked (change any of them)

| Decision | Default | Where |
| --- | --- | --- |
| Launch | Lagos, Abuja and Port Harcourt (Rivers State), city by city; first areas near universities (Akoka, Gwagwalada, Choba) | `src/lib/seed.ts` |
| Trades | Plumber, electrician, tailor, carpenter | `src/lib/seed.ts` |
| Commission | 10% of the job, taken from the artisan payout | `COMMISSION_BPS` in `src/lib/money.ts` |
| Payment | Demo provider only. Paystack is the proposed real provider | `payAndHold` in engine |
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

1. Database: Neon project `sabihand` (aws-us-east-2) already has the schema from `db/migrations/0001_init.sql`. Next: add DATABASE_URL to Vercel, pick a sign-in provider (phone/email) and wire it to `profiles.auth_id`.
2. Server actions that call the engine and write to Postgres; keep the status moves server-side only.
3. Real photo upload for portfolios (Vercel Blob or Cloudflare R2).
4. Paystack test-mode integration behind the same `payAndHold` / `release` functions.
5. Replace the 12 sample artisans with real ones the team has onboarded; remove the demo banner when real.
6. Notifications (WhatsApp or SMS) when a request or quote arrives.

## Run it

```
npm install
npm run dev      # http://localhost:3000
npm test         # engine tests
npm run typecheck && npm run lint && npm run build
```
