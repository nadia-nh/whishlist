# Wishlist

A flexible, frictionless wishlist app for gift-giving. Create a wishlist with just item names,
share a link, and let anyone mark things as purchased — no account needed on their end.

## Features

- **Passwordless login** — email in, a 6-digit code emailed to you, no password to remember
- **Low-friction item entry** — only a title is required; add a link, price, priority, or how
  flexible you are (exact match vs. "anything similar is fine") whenever you want
- **Public share links** — anyone with the link can view a wishlist and mark items as purchased
  without creating an account
- **Safe against double-claiming** — if two people try to claim the same item at once, only one
  succeeds

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose](https://mongoosejs.com)
- [Resend](https://resend.com) for OTP login emails (optional in dev — see below)
- [jose](https://github.com/panva/jose) for JWT session cookies

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

- **`MONGODB_URI`** — required. Create a free cluster at
  [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register), add a
  database user, allow your IP (or `0.0.0.0/0` for local dev only), and copy the Node.js driver
  connection string from the cluster's **Connect → Drivers** screen.
- **`JWT_SECRET`** — required. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **`RESEND_API_KEY`** — optional. Without it, login codes print to the server console instead of
  being emailed, so you can develop and test the full login flow without a Resend account. Set
  this (and optionally `RESEND_FROM_EMAIL`) whenever you're ready for real email delivery.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Hit `/api/health` to confirm the MongoDB
connection is working.

### 4. Logging in

Enter any email on the login screen. A 6-digit code is either emailed to you (if `RESEND_API_KEY`
is set) or printed to the terminal running `npm run dev` (look for a line like
`[dev] OTP code for you@example.com: 123456`).

## Project structure

```
src/
  app/
    api/            # Route handlers (auth, wishlists, items, public sharing)
    dashboard/       # Owner's list of wishlists
    login/           # Email + code sign-in
    w/[slug]/        # Public, no-login-required share page
    wishlists/       # Create + manage a wishlist and its items
  components/        # UI components (forms, cards, modals)
  lib/                # Shared server-side helpers (db, auth, otp, email, rate limiting)
  models/             # Mongoose schemas (User, Wishlist, WishlistItem)
  proxy.ts            # Route protection for /dashboard and /wishlists/*
  types/              # Shared TypeScript types
```

## Project docs

- [`FUTURE_ROADMAP.md`](FUTURE_ROADMAP.md) — features intentionally deferred from the original
  spec (Cloudinary uploads, cash pledges via Stripe/Venmo/PayPal, "Surprise Mode", hardening,
  deployment), phased for later.
- [`PLAN_INLINE_EDIT_AND_ONBOARDING.md`](PLAN_INLINE_EDIT_AND_ONBOARDING.md) — planned redesign of
  item cards to inline click-to-edit fields, plus in-app guidance copy.
- [`PLAN_AUTOPARSE_AND_QUICK_FIXES.md`](PLAN_AUTOPARSE_AND_QUICK_FIXES.md) — planned link
  autoparsing (paste a URL, auto-fill title/image/price) plus small UI fixes.
- [`IMPLEMENTATION_CHECKLIST.md`](IMPLEMENTATION_CHECKLIST.md) — build steps and verification notes
  from the initial v1 build.

## Linting & type-checking

```bash
npm run lint
npx tsc --noEmit
```
