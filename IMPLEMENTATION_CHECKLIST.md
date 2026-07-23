# v1 Implementation Checklist

Tracks the build steps from the initial plan. All items below are complete and were verified
against a real MongoDB connection (a temporary local instance during development; swap in your
own MongoDB Atlas connection string in `.env.local` before real use — see `.env.example`).

- [x] **1. Scaffold project** — `create-next-app` (TS/Tailwind/App Router/src-dir).
  *Verified:* `npm run dev` serves the app at `localhost:3000` with no console errors.

- [x] **2. Install v1 dependencies** — `mongoose`, `jose`, `nanoid` only.
  *Verified:* no cloudinary/resend/stripe/microlink in `package.json`.

- [x] **3. Env wiring** — `.env.example` (committed) + `.env.local` (gitignored) with
  `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`.
  *Verified:* `.env.local` confirmed gitignored via `git status --ignored`.
  *Still needed from you:* create a free MongoDB Atlas cluster and drop its connection string
  into `.env.local` — see `.env.example` for the format and a link to sign up.

- [x] **4. `lib/db.ts` cached connection + `/api/health`**.
  *Verified:* returns `{ ok: true }` against a real MongoDB connection; fails cleanly with a
  clear error message when the URI is a placeholder.

- [x] **5. `User` model + stub auth routes** (login/logout/me).
  *Verified:* login sets an httpOnly cookie, `/api/me` gates on it correctly, logout clears it —
  all tested against a live database.

- [x] **6. Middleware route protection + `/login` page**.
  *Verified:* unauthenticated `/dashboard` request returns a 307 redirect to
  `/login?next=/dashboard`; authenticated requests pass through.

- [x] **7. `Wishlist` model + CRUD routes**.
  *Verified:* unique slug generation, cross-user access correctly rejected (404), invalid
  ObjectIds handled without crashing.

- [x] **8. Dashboard / new / detail owner pages**.
  *Verified:* full browser walkthrough — create a wishlist via the UI, see it on the dashboard,
  open its detail page.

- [x] **9. `WishlistItem` model + item CRUD routes**.
  *Verified:* title-only creation succeeds; PATCH with optional fields succeeds.

- [x] **10. Quick-add + item edit UI**.
  *Verified:* items add via the "Add" button and via Enter (a real browser keydown event was
  used to confirm the Enter-to-submit handler — see note below); edit modal persists optional
  fields across a page reload.

- [x] **11. Public share route + page**.
  *Verified:* opened in a browser context, renders wishlist + items read-only with no login
  prompt.

- [x] **12. Anonymous mark-as-purchased**.
  *Verified in the browser* (click → confirm → item flips to "Purchased") *and under real
  concurrency*: 5 simultaneous `POST` requests against the same item returned exactly one 200
  and four 409s.

- [x] **13. Cascade delete + owner-only guards**.
  *Verified:* deleting a wishlist removes its items (confirmed by 404 on direct item access
  afterward); non-owners get 404 on GET/PATCH/DELETE for both wishlists and items.

- [x] **14. Styling / empty / error state pass**.
  *Verified:* no horizontal overflow at 375px mobile width across dashboard, wishlist detail
  (including the edit modal), and public share pages; empty states render for no-wishlists and
  no-items cases; root `/` now redirects based on session instead of showing the Next.js
  starter template.

- [x] **15. `FUTURE_ROADMAP.md`** — phased doc covering OTP auth, Cloudinary, Stripe/Venmo/PayPal,
  Microlink scraping, Surprise Mode, hardening, and deployment.

- [x] **16. End-to-end smoke test** — full golden path run via API calls simulating the browser
  flow: login → create wishlist → quick-add items → owner enriches an item → anonymous guest
  views the public link → anonymous guest claims an item → owner sees the claim → cascade delete
  on cleanup. All steps passed.

## Note on Enter-to-submit

The quick-add form originally relied on native "Enter submits the form" browser behavior. During
testing, the browser-automation tool's synthetic Enter key wasn't recognized as a real keydown by
the page, so an explicit `onKeyDown` handler was added to `QuickAddItemForm` to make Enter-submit
deterministic regardless of how the keypress is dispatched. This was verified working via a
genuine dispatched `KeyboardEvent`.
