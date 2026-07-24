<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project overview

A flexible, frictionless wishlist app: create a wishlist with only an item title required, share
a public link, and anyone can mark items as purchased without an account. Next.js 16 (App Router)
+ React 19 + TypeScript + Tailwind v4 + MongoDB Atlas/Mongoose.

Route protection lives in `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts` — see the
"How to Migrate" section in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
if this file ever needs revisiting).

# Project philosophy — read before adding dependencies or scope

This codebase deliberately favors the **leanest option** at every decision point, established
across several rounds of scoping:
- MongoDB Atlas was chosen specifically because it needed no local install, not because of a
  strong technical requirement.
- Cloudinary, Stripe, and a real email provider were all explicitly cut from the initial build;
  they're tracked in `FUTURE_ROADMAP.md`, not built speculatively.
- The OTP email feature (`src/lib/email.ts`) has a **console-log fallback** when `RESEND_API_KEY`
  is unset, so the whole auth flow is testable without a third-party account. Follow this pattern
  for any future integration that needs an external account: make the account-requiring path
  optional, degrade to something locally testable, and say so in `.env.example`.
- Link autoparsing (planned, see `PLAN_AUTOPARSE_AND_QUICK_FIXES.md`) is designed around a
  hand-rolled Open Graph regex scraper instead of the Microlink API, specifically to avoid a new
  external account — don't reach for a 3rd-party API/SDK before checking whether a plan doc
  already reasoned through a no-dependency alternative.

Before adding a new npm dependency, check `package.json` — it has stayed intentionally small
(`jose`, `mongoose`, `nanoid` beyond Next/React itself). Prefer solving it with what's already
there or a small hand-rolled helper in `src/lib/` before reaching for a new package.

# Conventions to match

- **Env vars fail fast at module load**, not at first use — see `src/lib/db.ts` and
  `src/lib/auth.ts`: `if (!process.env.X) throw ...` immediately after the check, assigned to a
  `const X: string = process.env.X` (not `const X = process.env.X; if (!X) throw`) — the second
  form fails TypeScript's control-flow narrowing when the variable is used inside a function
  defined later in the same module. Follow the first pattern for any new required env var.
- **Mongoose model registration** always guards with `models.X || model("X", schema)` to survive
  Next's dev-mode hot reload without an `OverwriteModelError`.
- **Route handlers** validate/own-check inline rather than via shared middleware-per-route (see
  `src/app/api/wishlists/[id]/route.ts`'s `loadOwnedWishlist` helper pattern, duplicated similarly
  in `src/app/api/items/[itemId]/route.ts`'s `loadOwnedItem`) — keep new owner-scoped routes
  consistent with this rather than introducing a new abstraction.
- **Public (anonymous) routes** live under `src/app/api/public/` and never call
  `getSessionUser()` — keep that boundary clean so it's obvious at a glance which routes require a
  session.
- **Atomic guards over locks**: the anonymous "mark as purchased" flow
  (`src/app/api/public/items/[itemId]/fulfill/route.ts`) uses a single
  `findOneAndUpdate({ _id, isFulfilled: false }, ...)` to prevent double-claims, not an
  application-level lock. Reuse this pattern for any future single-flag concurrency guard before
  reaching for a version/optimistic-locking field (that's tracked as a Phase 6 hardening item, not
  needed yet).
- **In-memory, single-process helpers are acceptable for now** (see `src/lib/rateLimit.ts`) but
  must be called out as such in comments/roadmap notes — they reset on deploy and won't be shared
  across serverless instances. Don't silently assume they're production-grade.

# Where to look for planned work

Don't re-derive a design that's already been planned. Check these first:
- `FUTURE_ROADMAP.md` — phased list of everything deferred from the original spec (real auth was
  Phase 2, done; Cloudinary/Microlink is Phase 3; cash pledges Phase 4; Surprise Mode Phase 5;
  hardening Phase 6; deployment Phase 7), plus a small "Backlog" section for looser ideas.
- `PLAN_INLINE_EDIT_AND_ONBOARDING.md` — detailed, ready-to-implement design for turning
  `ItemCard.tsx` into inline click-to-edit fields (retiring `ItemEditModal.tsx`) and adding
  onboarding copy.
- `PLAN_AUTOPARSE_AND_QUICK_FIXES.md` — detailed design for link autoparsing, the destructive
  delete-button restyle, and the quick-add hint-text fix.
- `IMPLEMENTATION_CHECKLIST.md` — what was actually verified when v1 was built, and how.

# Verification expectations

There is no automated test suite in this repo. Changes are verified by running `npm run dev` and
exercising the flow directly (curl for API routes, the browser for UI), plus `npx tsc --noEmit`
and `npm run lint`. Match this approach for new work rather than introducing a test framework
speculatively — if a real test suite is wanted, that should be its own explicit decision, not a
side effect of one feature PR.
