# Plan: Guest Mode — Create & Share Without Logging In

Status: planned, not yet implemented.

## 1. Problem statement

Every wishlist currently requires an authenticated owner: `Wishlist.ownerId` is `required: true`,
a ref to `User` (`src/models/Wishlist.ts:6`); `/wishlists/*` and `/dashboard` are gated by
`src/proxy.ts`'s matcher; and `POST /api/wishlists` calls `getSessionUser()` and 401s without a
session. There's no way to try the app without first going through the OTP login flow.

User feedback: let people land on the site and immediately create a wishlist with items, with
zero login required — only prompt for login if/when they want the data to persist beyond local,
ephemeral storage (i.e., recoverable across devices or if cookies get cleared, not lost the moment
that happens).

## 2. Key design tension: what does "persisted beyond local storage" mean, given sharing already exists?

The app's core existing feature is a public share link (`/w/[slug]`) that has to work for anyone,
on any device, without the guest ever touching the owner's browser. A purely client-side
(localStorage-only, zero server writes) implementation would **not** support sharing until some
explicit "publish" or "log in" step, since another device can't see a different browser's
localStorage. Two real options exist, with different guest-mode semantics:

### Option A — True local-only until claimed (the literal reading of "in local storage")

Guest builds a wishlist entirely in `localStorage`; nothing hits the server until they log in, at
which point the whole payload is POSTed in one shot, creating the real `Wishlist`/`WishlistItem`
documents (and the first-ever shareable link) at that moment.

- **Pro**: matches the literal framing — nothing persisted server-side unless you choose to log in.
- **Con**: defeats "start creating and share immediately" if sharing is part of the point — a
  friend can't see the list until the owner has already logged in, reintroducing friction at
  exactly the moment this feature is meant to remove it. Also costs more to build: a client-side
  data layer that mirrors the server schema, plus a bulk-import-on-first-login endpoint.

### Option B — Anonymous server-side wishlist with a client-held ownership token (recommended)

`POST /api/wishlists` (and everything under it) accepts requests with **no session cookie at
all**. Instead of requiring `ownerId`, it issues a random, unguessable **anonymous owner token**
(same `nanoid`-based approach already used for slugs in `src/lib/slug.ts`), stored in a new
`httpOnly` cookie (e.g. `anon_owner`), separate from the existing `session` cookie
(`SESSION_COOKIE_NAME` in `src/lib/auth.ts`). `Wishlist` gets a new optional
`anonOwnerToken: { type: String, index: true }` field, and `ownerId` becomes optional
(`required: false`). Ownership checks (`loadOwnedWishlist` in
`src/app/api/wishlists/[id]/route.ts`, `loadOwnedItem` in `src/app/api/items/[itemId]/route.ts`)
accept a match on **either** the session's `ownerId` **or** the `anon_owner` cookie's token.
Sharing works immediately and unchanged — `/w/[slug]` and the fulfill flow never depended on
authentication in the first place. "Persisting beyond local storage" then means: **claiming** the
anonymous wishlist by logging in, which sets `ownerId` on the *existing* document — no data
migration or duplication, just one field write.

- **Pro**: sharing works immediately in guest mode, matching the app's actual value proposition;
  claiming is a single `ownerId` write on an existing document.
- **Con**: the wishlist is sitting in the real database before any login happens — a weaker match
  to the literal "local storage" framing — and unclaimed anonymous wishlists accumulate in the DB
  unless cleaned up (needs a TTL/cleanup job eventually — not built now, flagged below).

**Recommendation: Option B.** It's the only option that doesn't regress the app's actual selling
point (a link anyone can open immediately), and "claiming" is a small, well-understood operation
compared to Option A's client-side-schema-mirroring plus bulk-import machinery. If, on reflection,
the literal "stays in local storage until I log in, and isn't visible to anyone else until then" is
actually the important part (not sharing before login), Option A is the one to build instead —
flagging this explicitly since it changes the whole shape of the feature.

## 3. Data model changes

- `src/models/Wishlist.ts`: make `ownerId` optional (`required: false`); add
  `anonOwnerToken: { type: String, index: true }`.
- No change needed to `WishlistItem` — items are always scoped by `wishlistId`; ownership is
  resolved via the parent wishlist regardless of whether it's anon- or user-owned.

## 4. Auth/cookie changes

- New cookie `anon_owner`: `httpOnly`, `sameSite=lax`, long-lived (e.g. 1 year) — separate from
  `session`. Generated once per browser on first anonymous wishlist creation if not already
  present, then reused for every subsequent anonymous wishlist from that browser (so one guest can
  make several lists before deciding to log in, all claimable together).
- `src/proxy.ts`'s matcher currently protects `/dashboard/:path*` and `/wishlists/:path*`
  unconditionally. This must change: `/wishlists/new` and `/wishlists/[id]` need to become
  reachable without a session, gated instead by "has either a session, or a valid `anon_owner`
  cookie matching *this* wishlist's `anonOwnerToken`." `/dashboard` most likely stays
  session-gated, since it lists *your account's* wishlists by `ownerId` — see the open question
  below on whether anonymous users need any "your wishlists so far" view at all.

## 5. Route changes

- `POST /api/wishlists`: drop the `getSessionUser()` 401 guard. If a session exists, set `ownerId`
  as today. If not, ensure/create the `anon_owner` cookie and set `anonOwnerToken` instead.
- `GET/PATCH/DELETE /api/wishlists/[id]`, `POST .../items`, `PATCH/DELETE /api/items/[itemId]`:
  `loadOwnedWishlist`/`loadOwnedItem` need a second branch — when there's no session, match
  `anonOwnerToken` against the request's `anon_owner` cookie instead of matching `ownerId` against
  `session.sub`.
- New: a claim step — either `POST /api/wishlists/claim` or folded into the existing
  `POST /api/auth/verify` (`src/app/api/auth/verify/route.ts`) — once a user logs in, find any
  `Wishlist` documents matching the browser's current `anon_owner` cookie value, set `ownerId` to
  the newly authenticated user, and clear `anonOwnerToken`. This is the one genuinely new
  endpoint/step; everything else is conditional branching on existing routes.

## 6. UI changes

- `src/app/page.tsx` currently redirects to `/login` or `/dashboard` based on session. New:
  redirect to `/wishlists/new` (or a dedicated guest landing) when there's no session, instead of
  forcing `/login` first.
- `src/app/wishlists/[id]/page.tsx` needs a persistent, non-annoying banner when viewed
  anonymously — e.g. "This wishlist isn't saved to an account yet — log in to keep it if you clear
  your cookies," with a login CTA reusing `LoginForm.tsx`'s existing two-step flow. Dismissible
  per-session, not permanently — consistent with this app's existing bias against unnecessary
  persistent state (see `PLAN_INLINE_EDIT_AND_ONBOARDING.md`'s onboarding-copy section for the
  same reasoning already applied elsewhere).
- Open question (below) on whether a guest needs any "your wishlists so far" list if they create
  more than one before claiming.

## 7. Security/abuse considerations to document, not block on

- Anonymous wishlists are only as safe as the `anon_owner` cookie value — anyone who obtains it
  (e.g. a shared/public computer) can edit or delete that wishlist. This is materially weaker than
  session-based auth and should be called out explicitly in the PR description when this is built,
  not silently accepted as equivalent security.
- No rate limiting on anonymous wishlist creation today (unlike OTP `send-code`) — someone could
  spam-create empty wishlists. Note as a `FUTURE_ROADMAP.md` Phase 6 hardening follow-up, not a
  blocker for v1 of this feature given the app's low-stakes, invite-only realistic usage pattern.
- Needs an eventual cleanup story for abandoned, never-claimed anonymous wishlists (e.g. a Mongo
  TTL index on `createdAt` scoped to anon-owned documents) — a fast-follow, not a blocker.

## 8. Sequencing

1. Make `ownerId` optional and add `anonOwnerToken` to `Wishlist` (section 3).
2. Add anon-cookie helpers to `src/lib/auth.ts`, mirroring the existing `sessionCookieOptions`
   pattern.
3. Update `loadOwnedWishlist`/`loadOwnedItem` to accept anon-token matches alongside session
   matches.
4. Update `POST /api/wishlists` to work without a session.
5. Update `src/proxy.ts` so `/wishlists/new` and `/wishlists/[id]` are reachable anonymously.
6. Build the claim step.
7. Update `src/app/page.tsx`'s redirect logic and add the anonymous-wishlist banner/CTA.
8. Manual verification: create a wishlist with zero cookies present, add items, share the link
   (confirm the public page works exactly as it does today, fully unauthenticated), then log in
   and confirm the wishlist now shows up on `/dashboard` under the real account, and decide/verify
   what happens to the stale `anon_owner` cookie afterward (see open questions).

## 9. Open questions to resolve before implementation

- Does `/dashboard` need its own "anonymous wishlists you've made so far" view, or is
  claim-on-login enough (you only ever see your guest wishlists once they've been claimed)?
  Recommend the latter for v1 — simpler, and matches "log in when you want it to persist and be
  visible as yours."
- Should the `anon_owner` cookie be cleared immediately after a successful claim, or left inert?
  Recommend clearing it, to avoid a stale cookie later matching a *different* anonymous wishlist
  created in the same browser before a subsequent login.
- Should there be any cap on how many anonymous wishlists one browser/cookie can create before
  being nudged to log in? Not needed for v1 — flag as a possible future nudge, not a hard
  requirement.
- Revisit whether Option A (true local-storage-only, no server write pre-login) is actually the
  better fit if, on reflection, "not visible to anyone until I log in" matters more than
  "shareable immediately" — this doc assumes the latter based on the app's existing sharing-first
  design, but that assumption is worth confirming before building.

## Critical Files for Implementation

- src/models/Wishlist.ts
- src/lib/auth.ts
- src/proxy.ts
- src/app/api/wishlists/route.ts
- src/app/api/wishlists/[id]/route.ts
- src/app/api/wishlists/[id]/items/route.ts
- src/app/api/items/[itemId]/route.ts
- src/app/api/auth/verify/route.ts (claim step)
- src/app/page.tsx
- src/app/wishlists/[id]/page.tsx
