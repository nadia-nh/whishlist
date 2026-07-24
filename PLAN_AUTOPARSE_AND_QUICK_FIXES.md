# Plan: Link Autoparsing + Destructive-Button Restyle + Hint-Text Fix

Status: sections 1 and 2 (destructive-button restyle, hint-text fix) are **done**. Section 3
(link autoparsing) is still planned, not yet implemented. Companion doc:
`PLAN_INLINE_EDIT_AND_ONBOARDING.md` (inline click-to-edit card redesign + onboarding copy live
there instead).

## 1. Destructive-action button restyle ✅ Done

### 1.1 Current state (grounded)

- `src/components/DeleteWishlistButton.tsx:18` — `<button className="text-sm text-red-600
  hover:underline">Delete wishlist</button>`, guarded by `window.confirm(...)` at line 9.
- `src/components/ItemCard.tsx:59` — `<button className="text-red-600
  hover:underline">Delete</button>`, guarded by `window.confirm(...)` at line 26, sitting right
  next to (today) an "Edit" link styled `text-gray-500 hover:underline` (that Edit link goes away
  per the companion inline-edit doc, but the Delete button itself and its styling are unaffected by
  that change and can ship independently in either order).

Both are bare text links with no button chrome — bright, saturated `red-600` with no visual
weight/containment, which reads as more alarming than the existing calmer app aesthetic (compare
to the `Confirm`/`Cancel` buttons in `PublicItemCard.tsx:98-111`, which use neutral
`bg-gray-900`/`border-gray-300` for real actions).

### 1.2 Recommended restyle — concrete classes

Move from "red text link" to a **muted outline/ghost button** using the same button chrome as
existing secondary actions elsewhere (`rounded-md border ... px-3 py-1.5 text-sm`, e.g.
`PublicItemCard.tsx:100-101`'s Cancel button), but with a restrained red accent so it still reads
as "different/destructive" without being the loudest thing on the screen.

**Before** (`DeleteWishlistButton.tsx:18`):
```tsx
className="text-sm text-red-600 hover:underline"
```
**After:**
```tsx
className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
```

**Before** (`ItemCard.tsx:59`):
```tsx
className="text-red-600 hover:underline"
```
**After** (slightly smaller footprint since it sits inline in a card action row, not standalone):
```tsx
className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
```

Rationale for the exact shade: `red-200`/`red-700` (light) and `red-900/60`/`red-400` (dark) pull
the saturation down from the current `red-600` text-only treatment while keeping enough hue to
still read unambiguously as "delete," and the bordered-button chrome gives it the same visual
weight class as every other button in the app (`rounded-md`, `px-`/`py-` padding, `text-sm`),
rather than being the only unbounded text link with color as its sole affordance.

### 1.3 Confirmation UX — keep native `confirm()`, or adopt the inline-panel precedent?

Two options, concrete trade-offs:

**Option 1 (lower effort, recommended default): keep `window.confirm()`.** No code path changes
beyond the class swap above. Native confirm dialogs are already used consistently for both delete
actions (`DeleteWishlistButton.tsx:9`, `ItemCard.tsx:26`) and for a lean MVP-style codebase this is
the "leanest option" consistent with this project's established preference (per the grounding:
Atlas over alternatives, Cloudinary/Stripe/Resend cut from v1). No new component, no new state,
no new a11y work (native dialogs are naturally accessible).

**Option 2 (more polished, more effort): custom inline confirm panel**, reusing the pattern already
proven in this codebase at `src/components/PublicItemCard.tsx:85-113` — `showConfirm` boolean state
that swaps the button row for an inline `bg-gray-50 dark:bg-gray-900` panel with Cancel/Confirm
buttons. Applied to `ItemCard.tsx`'s delete flow, this would mean:
```tsx
const [confirmingDelete, setConfirmingDelete] = useState(false);
// ...replace handleDelete's window.confirm with toggling confirmingDelete,
// then render a small inline panel (same visual pattern as PublicItemCard.tsx:85-113)
// with "Delete this item?" + Cancel + a red-accented Confirm button before actually calling
// DELETE /api/items/${id}.
```
This is strictly nicer (native `confirm()` dialogs can't be styled at all, look jarring/OS-native
against an otherwise custom UI, and are step-outside-the-page — a modal in the true browser sense)
but doubles the surface area of this specific fix (new state, new render branch, needs the same
treatment applied twice — once for `DeleteWishlistButton.tsx`, once for `ItemCard.tsx` — and
`DeleteWishlistButton.tsx` doesn't currently have a natural "inline panel" home since it sits in a
page header `flex items-start justify-between` row, not a card with room to expand downward).

**Recommendation**: ship Option 1 (native confirm + the class restyle above) for this PR — it
directly answers the user's stated complaint ("the bright red is shocking") without scope creep.
Note Option 2 explicitly in this doc as a follow-up so a future PR can lift the
`PublicItemCard.tsx` inline-confirm pattern into both delete flows if wanted later.

## 2. Quick-add hint-text truncation fix ✅ Done

### 2.1 Current state (grounded)

`src/components/QuickAddItemForm.tsx:41-63`:
```tsx
<form onSubmit={handleSubmit} className="flex flex-col gap-1">
  <div className="flex gap-2">
    <input
      ...
      placeholder="Add an item... (just a name is fine)"
      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
    />
    <button type="submit" ...>Add</button>
  </div>
</form>
```
The input has `flex-1` but no `min-width: 0` override. In a flex row, `flex-1` items default to
`min-width: auto`, which means the input refuses to shrink below its content's intrinsic width —
but since this is an `<input>` (not text content driving width), the practical failure mode here is
different: the input itself will shrink fine, it's the **placeholder text getting visually clipped
inside the input's padding-box** on narrow viewports because the non-shrinking "Add" button
(`shrink-0` is implicit — buttons aren't flex items so they don't shrink by default either) eats
into the available row width, leaving the input narrower than the placeholder string needs. Net
effect: on narrow/mobile viewports the placeholder `"Add an item... (just a name is fine)"` gets
cut off with no ellipsis or wrap, exactly matching the reported symptom.

### 2.2 Recommended concrete fix

Apply **two changes together** (belt-and-suspenders, both are cheap and address different aspects
of the same symptom):

1. **Add `min-w-0` to the input** — the standard fix for "flex child won't shrink because of
   content" in Tailwind flex layouts, even though here it's more about giving the browser explicit
   permission to compute a narrower box rather than fighting an intrinsic-content-width flex bug:
```tsx
className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
```

2. **Shorten the placeholder copy** so it fits comfortably even on a 320-375px viewport without
   relying on layout tricks alone. Recommended replacement:
```tsx
placeholder="Add an item…"
```
   and move the "(just a name is fine)" clarification out of the transient placeholder (which
   disappears the instant the user starts typing, and clips before that on narrow screens) and
   into a **persistent small caption below the input row** — which also directly satisfies the
   onboarding-copy goal from the companion doc, so implement this caption once and let it serve
   both purposes:
```tsx
<form onSubmit={handleSubmit} className="flex flex-col gap-1">
  <div className="flex gap-2">
    <input
      ...
      placeholder="Add an item…"
      className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900"
    />
    <button type="submit" ...>Add</button>
  </div>
  <p className="text-xs text-gray-400">Just a name is fine — add details later.</p>
  {error && <p className="text-sm text-red-600">{error}</p>}
</form>
```
   This is a more robust fix than only shortening the placeholder, because it also fixes the root
   cause (a bare `flex-1` input can still clip an even-shorter placeholder at extreme widths like a
   folded/split-screen mobile browser) and gives the "just a name is fine" reassurance a permanent,
   always-visible home instead of one that vanishes the moment the user types a character.

## 3. Link-autoparsing feature

### 3.1 Scope decision: dedicated route vs. folding into item-create

**Recommendation: dedicated `POST /api/scrape-metadata` route**, matching the original roadmap
(`FUTURE_ROADMAP.md`), called from the client *before* the create/patch request, rather than
having `POST /api/wishlists/[id]/items` silently scrape server-side on every create. Reasoning:
- Keeps the scrape (an external network call with its own latency/failure modes) decoupled from
  the authoritative create/update path — if scraping is slow or the target site is down, item
  creation must not be blocked or delayed on it.
- Lets the UI show a distinct "fetching preview…" state and let the user see/adjust the scraped
  title before it's saved, rather than committing scraped data sight-unseen.
- Reuses the same endpoint for both the quick-add flow (paste URL, prefill fields, submit) and
  potentially a future "add link to existing item" inline-edit flow (ties to the companion doc's
  `url` field editor) without duplicating scrape logic in two API routes.

### 3.2 Route design

`src/app/api/scrape-metadata/route.ts` (new file):
```
POST /api/scrape-metadata
Body:    { url: string }
Success: 200 { title: string | null, imageUrl: string | null, price: number | null, sourceUrl: string }
Failure: 200 { title: null, imageUrl: null, price: null, sourceUrl: string, error: "unreachable" | "invalid_url" | "timeout" | "no_metadata" }
```
Design notes:
- Always return **200** (not 4xx/5xx) for scrape failures that aren't a malformed request — a
  failed scrape is a normal, expected outcome (many sites won't have OG tags, or will block
  scraping), not a server error. The client uses the `error` field to decide whether to fall back
  to raw-URL-only, not the HTTP status. Reserve a real 400 only for `{ url }` missing/not a string,
  and require auth (`getSessionUser()`) matching every other route in this app, since this still
  costs server-side network I/O and should not be an open public endpoint.
- **Timeout**: wrap the `fetch()` in an `AbortController` with an 4-5 second timeout — unreachable
  or slow sites must not hang the request indefinitely. On timeout, return `error: "timeout"`.
- **Size cap**: don't buffer an arbitrarily large response body before parsing — read a bounded
  prefix (e.g. first ~200KB via a streamed reader, since OG meta tags live in `<head>` and appear
  early in nearly all real-world HTML) to avoid a malicious/huge URL exhausting server memory.
- **Parsing approach**: a lightweight regex-based extraction of `<meta property="og:...">` /
  `<meta name="twitter:...">` tags — no need for a full DOM parser dependency (matches this
  project's "no new dependency unless necessary" pattern; `package.json` today has exactly 4
  runtime deps: `jose`, `mongoose`, `nanoid`, `next`). Concretely: a regex like
  `/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i` (and mirrored for
  `og:image`, `og:price:amount` / `product:price:amount` (rare but exists on some e-commerce
  sites), falling back to `twitter:title`/`twitter:image` if the `og:*` variant is absent).
- **Known limitation to document in code comments**: pages that render their OG tags client-side
  via JavaScript (many modern SPA storefronts) will not expose them in the raw HTML this fetch
  sees, since this approach does no JS execution/rendering — this is the direct trade-off against
  Microlink (which does render JS-heavy pages and proxies/CDNs the image). Explicitly acceptable
  for v1 per the "leanest option" preference already established for this project; the fallback
  path below means this limitation degrades gracefully rather than breaking the flow.
- **Fallback on any failure**: the calling UI must still let the user add the item with just the
  raw pasted URL as the `url` field and the URL (or a manually-typed title) as `title` — parsing
  failure is never a hard blocker to adding the item. This must be true whether the failure is
  `invalid_url`, `unreachable`, `timeout`, or `no_metadata` (tags absent).

### 3.3 New fields needed on `WishlistItem`

`src/models/WishlistItem.ts` already has a comment reserving this: `// DEFERRED (later phases):
imageUrl (Cloudinary), ogImageUrl/ogTitle (Microlink scrape)`. For this feature:
- Add **`ogImageUrl: { type: String, trim: true }`** — stores the scraped image URL directly
  (hotlinked from the source site), not a re-hosted copy. No Cloudinary/image-hosting dependency,
  consistent with that still being explicitly deferred.
- **No new field needed for title** — a scraped OG title just prefills the existing `title` input
  client-side before submit; it's saved as the item's normal `title`, no separate `ogTitle` column
  needed unless the product wants to preserve "what was scraped" vs. "what the user kept" (not
  required for v1 — skip it, only add `ogTitle` later if there's a concrete need to diff/re-scrape).
- **Price**: if scraped, prefill the existing `price` field the same way — no new column.
- Migration note: this is an additive, optional field on an existing Mongoose schema — no
  migration script needed (matches how `priority`/`matchPreference` etc. were added originally;
  Mongoose doesn't enforce schema on existing documents, missing = `undefined`/absent).

### 3.4 Image hotlinking constraint (important, checked against actual config)

`next.config.ts` currently has **no `images.remotePatterns` configured at all** (default empty
config — confirmed by reading the file). This matters because:
- If `ogImageUrl` is ever rendered via Next's `<Image>` component, Next requires every remote
  source domain to be explicitly allow-listed in `next.config.ts` `images.remotePatterns` —
  completely impractical here since the whole point of autoparsing is arbitrary user-pasted URLs
  from arbitrary domains, which can't be allow-listed in advance.
- **Recommendation: render `ogImageUrl` with a plain `<img src={item.ogImageUrl} />` tag**, not
  `next/image`, explicitly bypassing Next's image optimization for this field. Add an eslint-disable
  comment for the `@next/next/no-img-element` rule at that specific usage site (this project's
  `eslint.config.mjs` extends `eslint-config-next`, which enables that rule by default) since this
  is an intentional, justified exception, not an oversight.
- Trade-off to note in code/PR description: no image optimization/resizing/lazy-loading-by-default
  that `next/image` would give you, and a small hotlink-rot risk (source site changes/removes the
  image later, or blocks hotlinking via `Referer` checks) — acceptable for a v1 of this feature per
  established scope-cutting precedent; revisit if/when Cloudinary re-hosting (Phase 3 of
  `FUTURE_ROADMAP.md`) is eventually built.

### 3.5 Quick-add UX — URL detection and branching

In `src/components/QuickAddItemForm.tsx`, add a lightweight client-side check on the input value
(no need for a strict URL-parsing library — `try { new URL(trimmed) } catch { ... }` after checking
it starts with `http://`/`https://` is sufficient and needs zero new dependencies):

```tsx
function looksLikeUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value.trim())) return false;
  try { new URL(value.trim()); return true; } catch { return false; }
}
```

Branching behavior on submit (`submitItem()`):
1. If `looksLikeUrl(title)` is false (the common case — a plain item name), behave exactly as
   today: `POST /api/wishlists/[id]/items` with just `{ title: trimmed }`. **No behavior change for
   the majority path.**
2. If `looksLikeUrl(title)` is true: before creating the item, show a brief loading state (e.g.
   disable the input, change the "Add" button label to "Fetching…") and call `POST
   /api/scrape-metadata` with `{ url: trimmed }`.
   - On success with a usable `title`: create the item via the normal create endpoint with `{
     title: scrapedTitle, url: trimmed, price: scrapedPrice ?? undefined }` — plus `ogImageUrl` if
     present. Consider requiring `POST /api/wishlists/[id]/items` to accept an optional
     `ogImageUrl` field too (small addition to that route, mirroring how it already accepts
     `price`/`priority`/etc. as optional).
   - On failure/no-metadata: create the item with just `{ title: trimmed, url: trimmed }` — i.e.
     the pasted URL becomes both the raw title text and the link, exactly matching today's
     no-autoparse behavior for a URL typed into the plain-text quick-add field. **This is the
     graceful fallback**: the user never sees an error that blocks adding the item; at worst, they
     get an item titled with the raw URL that they can then retitle via the inline-edit title field
     from the companion doc.
3. Either path ends the same way: clear the input, `router.refresh()`, refocus — no change to that
   tail behavior.

Update the quick-add caption (introduced in section 2.2 above) once this ships, to advertise the
new capability, e.g.:
```
Just a name is fine — or paste a link and we'll try to fill in the details.
```

### 3.6 Sequencing within this PR

1. Add `ogImageUrl` to `src/models/WishlistItem.ts`.
2. Build `src/app/api/scrape-metadata/route.ts` (auth guard, timeout, bounded read, regex parse,
   always-200-on-scrape-failure contract).
3. Extend `POST /api/wishlists/[id]/items` (`src/app/api/wishlists/[id]/items/route.ts`) to accept
   an optional `ogImageUrl` string in the create body, mirroring the existing optional-field
   pattern already used for `price`/`priority`/`matchPreference` there.
4. Add `looksLikeUrl()` + the fetch-then-create branch to `QuickAddItemForm.tsx`.
5. Render `ogImageUrl` (if present) somewhere on `ItemCard.tsx` / `PublicItemCard.tsx` — smallest
   reasonable addition: a small thumbnail (e.g. `h-12 w-12 rounded object-cover`) to the left of
   the title, via a plain `<img>` per section 3.4. Land after (or coordinate with) the companion
   doc's `ItemCard.tsx` rewrite, since both touch the same file — recommend landing whichever PR is
   ready first and rebasing the second, rather than blocking either on the other.
6. Ship the two quick fixes (sections 1 and 2 above) independently — they don't depend on
   autoparsing and can land in the same PR or a smaller separate one if the team prefers faster,
   lower-risk merges over one combined PR. Given the user explicitly bundled them into this doc,
   default to one PR covering all three (quick fixes + autoparsing) unless the implementer prefers
   splitting further.

## 4. Verification checklist for the eventual PR

- Delete buttons: visually confirm the new muted-red bordered style on both
  `DeleteWishlistButton.tsx` and `ItemCard.tsx`'s delete control, light and dark mode.
- Quick-add placeholder: resize to 320px/375px width and confirm the placeholder/caption text is
  never clipped.
- Autoparse happy path: paste a real product URL with OG tags into quick-add, confirm title/price/
  image prefill and the created item shows a thumbnail.
- Autoparse failure paths: paste a URL to a site with no OG tags (falls back to raw-URL title,
  item still created), an unreachable/typo'd URL (same graceful fallback, no thrown error visible
  to the user), and a slow/hanging endpoint if one can be simulated (confirm the ~5s timeout fires
  and falls back rather than hanging the Add button indefinitely).
- Confirm `POST /api/scrape-metadata` requires auth (401 when called without a session cookie).
- Confirm no new npm dependency was introduced (grep `package.json` — should still show no
  Microlink/Cloudinary/HTML-parser package added, matching the built-in-scraper decision).

## Critical Files for Implementation

- src/components/QuickAddItemForm.tsx
- src/components/DeleteWishlistButton.tsx
- src/components/ItemCard.tsx
- src/models/WishlistItem.ts
- src/app/api/wishlists/[id]/items/route.ts
- src/app/api/scrape-metadata/route.ts (new file)
- next.config.ts
