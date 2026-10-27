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
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | Sign-in with Google (Neon Auth). Google is the only way in |
| `PAYSTACK_SECRET_KEY` | Checkout. Without it the Pay button explains payment is not on yet. Set the webhook URL in Paystack to `/api/paystack/webhook` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL` | Email notifications (new request, quote, payment, job done, dispute, verification). Off until both the key and a sender on a verified domain (for example `Sabihand <hello@yourdomain.com>`) are set. `SITE_URL` is used for the links in the emails |
| `ADMIN_USER_IDS` | Comma-separated Neon Auth user ids that may use `/admin` (or `ADMIN_EMAILS`, which also requires a verified email) |
| `SITE_OFFLINE` | Set to `1` to hide the site: every page shows the Sabihand 404 page (API routes keep working). Set it on Production only, then redeploy. Delete it and redeploy to bring the site back |

```
npm install
npm run dev      # needs the variables above in .env.local
npm test
npm run typecheck && npm run lint && npm run build
```

## Sign-in with Google

Sign-in and sign-up are one button, "Continue with Google" (`src/components/auth-form.tsx`). `proxy.ts` finishes the trip back from Google
by swapping the one-time code in the address for a session cookie; all other requests pass through untouched.

Before launch use your own Google OAuth client so the consent screen shows Sabihand and not Neon:
1. Google Cloud Console, then APIs & Services, then Credentials: create an OAuth client ID of type Web application.
2. Authorized redirect URI: `{NEON_AUTH_BASE_URL}/callback/google` (exactly, no trailing slash).
3. Neon Console, project, Auth, OAuth providers: edit Google and paste the Client ID and Secret.
4. Google Cloud Console, OAuth consent screen: set the app name, support email and authorized domain, then publish it. While it is in Testing, only listed test users can sign in.
5. Neon Auth trusted domains must include the site origin (`https://sabihand.vercel.app`).

## Locations and GPS

Every state, the FCT and all 774 local government areas are in `src/data/locations.json`, each with a centre point.
Rebuild it with `npm run locations` (see `scripts/build-locations.mjs` for the source and its caveats).
The "Use my location" button asks the browser for a position, finds the nearest area in `src/lib/geo.ts`, and never sends the position anywhere.
