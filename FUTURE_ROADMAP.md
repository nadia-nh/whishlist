# Future Roadmap

The v1 build is a deliberately lean MVP: wishlist + item CRUD, a stubbed passwordless login,
public sharing by slug, and anonymous "mark as purchased." Everything below was in the original
product spec but was cut from v1 to ship something working end-to-end quickly. Nothing here is
abandoned — it's scoped for later phases.

## Phase 2 — Real Authentication ✅ Done

Replaced the v1 stub login (email in, session cookie out, no verification) with real passwordless
OTP auth:
- `otpCodeHash`, `otpExpiresAt`, `otpAttempts` added to the `User` model.
- `POST /api/auth/send-code` generates a 6-digit code (HMAC-hashed at rest, ~10 min expiry) and
  sends it via **Resend** — falls back to logging the code to the server console if
  `RESEND_API_KEY` isn't set, so local dev doesn't require a Resend account.
- `POST /api/auth/verify` checks the code (timing-safe comparison, expiry, max attempts) before
  issuing the same JWT session cookie as before.
- `send-code` is rate limited (3 requests / 10 min per email) via an in-memory limiter
  (`src/lib/rateLimit.ts`) — single-process only, see Phase 6 for a distributed replacement.

## Phase 3 — Media & Link Enrichment

- **Cloudinary image uploads**: add `imageUrl` / `imagePublicId` to `WishlistItem`, client-side
  direct upload widget, CDN-served thumbnails on item cards.
- **Microlink / Open Graph scraping**: when a user pastes a URL into the item form, call an
  async endpoint (`POST /api/scrape-metadata`) that fetches OG title/image/price and pre-fills
  the form fields, instead of requiring manual entry.

## Phase 4 — Cash Contributions

- Add `targetCash`, `cashRaised` to `WishlistItem`; `venmoHandle`, `paypalMeLink` to `Wishlist`.
- Render a progress bar toward `targetCash` on both owner and public views.
- Direct links to the owner's Venmo/PayPal.me for informal contributions.
- Stripe Checkout for in-app card pledges, with a webhook to reconcile `cashRaised` totals
  (needs idempotency handling so retried webhooks don't double-count).

## Phase 5 — Surprise Mode

- Add `isSurpriseMode` (boolean) to `Wishlist`.
- When enabled, the owner's own view of their wishlist hides `isFulfilled` / `fulfilledBy` status
  (so they can be surprised too), while guests still see and set fulfillment normally.
- Optionally pair with an `eventDate` field to auto-reveal after the occasion passes.

## Phase 6 — Hardening

- Replace the in-memory `send-code` rate limiter with a distributed store (e.g. Upstash/Redis) —
  the current one resets on every deploy and isn't shared across serverless instances.
- Rate limit all public endpoints (`fulfill`, public `GET`), not just auth.
- Replace the v1 atomic-but-simple `findOneAndUpdate({ isFulfilled: false })` guard with a full
  optimistic-locking/version field if more complex fulfillment states are added (e.g. partial
  cash pledges need their own concurrency-safe accumulation, not just a boolean flip).
- Audit logging for owner actions (create/edit/delete).
- Soft deletes for wishlists/items instead of hard deletes, to support "undo" and auditing.

## Phase 7 — Deployment

- Create the Vercel project, connect the repo, configure environment variables
  (`MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, plus Resend/Cloudinary/Stripe keys once
  those phases land).
- Move the MongoDB Atlas cluster's network access rules from open/dev settings to Vercel's
  specific egress IPs (or use Atlas's "allow from anywhere" only as a temporary bridge).
- Rotate `JWT_SECRET` to a production-only value, stored only in Vercel's environment settings.
- Add a basic uptime/error-monitoring hook (e.g. Vercel's built-in analytics, or Sentry) before
  sharing the production link widely.

## Backlog — Smaller Ideas (not yet scoped into a phase)

- **Default priority & flexibility per wishlist**: let the owner set a default `priority` and
  default `matchPreference` on a `Wishlist` (e.g. `defaultPriority`, `defaultMatchPreference`
  fields), applied automatically when a new item is quick-added without specifying one, instead of
  starting blank. Small, additive schema change; no dependency on any other phase above.

See also `PLAN_INLINE_EDIT_AND_ONBOARDING.md`, `PLAN_AUTOPARSE_AND_QUICK_FIXES.md`, and
`PLAN_GUEST_MODE.md` (try the app and create a wishlist with zero login, claiming it into your
account later) for detailed,
ready-to-implement plans covering item-card UX polish, onboarding guidance, and link autoparsing —
these flesh out parts of Phase 3 above and add UI feedback not in the original spec.
