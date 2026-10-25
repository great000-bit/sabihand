# Sabihand

Find a verified artisan near you, see the price range, pay safely. A location-based artisan marketplace for Nigeria
(plumbers, electricians, tailors, carpenters first; open across all of Nigeria), built for the Cowrywise Ambassadors
Innovation Challenge 2026.

Live product: real accounts, real database, no sample data. Artisans sign up themselves and the Sabihand team verifies them.

- Plan, defaults and open decisions: [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)
- Next.js 16 conventions for this repo: [AGENTS.md](AGENTS.md)

## Configuration (Vercel environment variables)

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Neon Postgres (pooled connection string) |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | Email sign-in (Neon Auth) |
| `PAYSTACK_SECRET_KEY` | Checkout. Without it the Pay button explains payment is not on yet. Set the webhook URL in Paystack to `/api/paystack/webhook` |
| `ADMIN_USER_IDS` | Comma-separated Neon Auth user ids that may use `/admin` (or `ADMIN_EMAILS`, which also requires a verified email) |

```
npm install
npm run dev      # needs the variables above in .env.local
npm test
npm run typecheck && npm run lint && npm run build
```

## Locations and GPS

Every state, the FCT and all 774 local government areas are in `src/data/locations.json`, each with a centre point.
Rebuild it with `npm run locations` (see `scripts/build-locations.mjs` for the source and its caveats).
The "Use my location" button asks the browser for a position, finds the nearest area in `src/lib/geo.ts`, and never sends the position anywhere.
