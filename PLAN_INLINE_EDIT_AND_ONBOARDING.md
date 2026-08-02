# Plan: Inline Click-to-Edit Item Cards + Onboarding Guidance

Status: **done**. Companion doc: `PLAN_AUTOPARSE_AND_QUICK_FIXES.md` (destructive-button
restyling and hint-text fix are done there too; link autoparsing is still planned).

## 1. Problem statement

`src/components/ItemCard.tsx` shows all item fields inline but routes every edit — even a
one-word title tweak — through `src/components/ItemEditModal.tsx`, a full-screen modal with all
six fields in one form. User feedback: this is heavier than it needs to be. Wanted: click directly
on a field to edit just that field, in place, with no modal. Empty optional fields (description,
url, price, priority, matchPreference) currently render nothing at all when unset — the user can't
tell they exist unless they open the modal. Wanted: a visible "add this" affordance per empty
field. Separately: the app has zero onboarding/guidance copy anywhere.

## 2. Component design

### 2.1 Shared primitives vs. one state-machine component

Recommendation: **two small reusable primitives**, not one big state machine. Each field on the
card is a thin wrapper around one of these:

- `src/components/inline/InlineEditableText.tsx`
  Props: `{ value: string | null; placeholder: string; emptyLabel: string; multiline?: boolean;
  inputType?: "text" | "number"; required?: boolean; onSave: (next: string) => Promise<void>; }`
  Renders either:
  - **read state**: the value as plain text (or the `emptyLabel` ghost affordance, e.g. `+ Add
    price`, styled `text-sm text-gray-400 hover:text-gray-600` — dashed/ghost look, not a solid
    button) wrapped in a clickable `<button type="button">` (for a11y — clickable divs are bad
    for keyboard/screen-reader users).
  - **edit state**: an `<input>` (or `<textarea>` when `multiline`) auto-focused via
    `useEffect`/`ref`, pre-filled with the current value, using the existing text-input classes
    (`rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900`) sized to
    roughly match the read state's footprint so the layout doesn't jump.

- `src/components/inline/InlineEditableSelect.tsx`
  Props: `{ value: string | null; options: { value: string; label: string }[]; emptyLabel: string;
  onSave: (next: string | null) => Promise<void>; }`
  Same read/edit split, but edit state is a native `<select>` (matches existing modal's pattern —
  no need for a custom dropdown component). Native `<select>` auto-opens on click/focus in most
  browsers, which doubles as "click to edit" for free.

Both primitives own their own `useState` for `{ editing, draftValue, saving, error }` — this keeps
each field independent (clicking the title doesn't put the price into edit mode, and a failed
price save doesn't roll back an in-flight title save). This directly answers "one component with
an internal state machine vs. many small components": many small independent components, each
with a trivial three-state machine (`idle -> editing -> saving -> idle`), is simpler to reason
about and matches how the fields already behave as independent PATCH-able attributes in the API.

### 2.2 Field-by-field mapping in the new `ItemCard.tsx`

| Field | Component | Read state | Edit state | Empty-state affordance |
|---|---|---|---|---|
| `title` | `InlineEditableText` | `font-medium` text | text input, `required` | N/A — title always has a value (schema-enforced) |
| `description` | `InlineEditableText` (`multiline`) | `text-sm text-gray-500` paragraph | `textarea rows={2}` | `+ Add description` ghost link |
| `url` | `InlineEditableText` | `<a>` "Link" anchor (unchanged) — but add a small pencil/edit affordance next to it, since the whole rendered value is a navigable link, not a natural click-to-edit target | text input `placeholder="https://..."` | `+ Add link` ghost link |
| `price` | `InlineEditableText` (`inputType="number"`) | `${price}` text | `<input type="number" min={0} step="0.01">` | `+ Add price` ghost link |
| `priority` | `InlineEditableSelect` | `{PRIORITY_LABELS[priority]} priority` text | `<select>` with None/Low/Medium/High | `+ Set priority` ghost link |
| `matchPreference` | `InlineEditableSelect` | `MATCH_PREFERENCE_LABELS[value]` text | `<select>` with the 4 `MATCH_PREFERENCES` options + blank | `+ Set flexibility` ghost link |

**Why `url` needs special handling**: unlike the other fields, the read state of `url` is itself
an interactive element (a link users want to click to *navigate*, not edit). Clicking the anchor
text should open the link; editing needs a separate small trigger. Recommended treatment: keep the
`<a>` as-is, and place a small trailing "Edit" affordance (text-xs, e.g. a pencil icon character or
the word "edit" in `text-gray-400`) immediately after it that toggles the same inline edit input.
When no url is set, the whole `+ Add link` ghost affordance is clickable and opens the input
directly (no separate edit trigger needed in the empty case).

### 2.3 Title is different from optional fields

- Title is the one field that must never be empty (`title: { type: String, required: true, trim:
  true }` in `src/models/WishlistItem.ts:6`). Its `InlineEditableText` instance passes `required`
  so the save handler rejects an empty draft client-side (matching the API's own guard: `PATCH
  /api/items/[itemId]` only overwrites `item.title` `if (typeof body?.title === "string" &&
  body.title.trim())` — an empty string is silently ignored server-side, so client-side validation
  is a UX nicety, not a security boundary).
- Title never shows a ghost/empty affordance — there is nothing to add, only to rename.
- Visually keep the `font-medium` treatment on title's read state so it stays the visual anchor of
  the card, distinct from the lighter-weight ghost affordances of optional fields.

### 2.4 Keyboard behavior (uniform across both primitives)

- `Enter` (single-line `input`/`select`): trigger save, same as clicking a save affordance (see UI
  below on whether there's an explicit save button vs. save-on-blur).
- `Ctrl+Enter` or `Enter` with `Shift` held is **not** needed for `textarea` (description) since
  plain `Enter` there should insert a newline; use `Ctrl+Enter`/`Cmd+Enter` to save, and rely on
  blur-to-save (see below) as the primary path for that field.
- `Escape`: discard the draft, revert to the last-saved value, exit edit mode. Must not fire the
  save handler.
- **Save-on-blur as the primary commit path** (recommended addition beyond just Enter/Escape):
  clicking away from an inline input should save (if the value changed) rather than silently
  discarding, since there's no visible modal "Save" button to remind the user unsaved changes
  exist. Escape remains the explicit "I changed my mind" path. This matches low-friction apps
  (Notion, Trello inline-edit patterns) and avoids a whole new class of bug reports ("I typed a
  price and it didn't save").
- While `saving`, disable the input (`disabled` + slightly dimmed) so a second edit can't race the
  in-flight PATCH; on error, keep the field in edit mode with a small inline `text-sm text-red-600`
  message below it (consistent with existing error rendering in `QuickAddItemForm.tsx:64` and
  `ItemEditModal.tsx:135`) and let the user retry or Escape out.

### 2.5 Fate of `ItemEditModal.tsx`

**Retire it entirely.** Once every field is independently inline-editable, there is no remaining
case the modal covers that inline editing doesn't — it was only ever a convenience wrapper around
the same `PATCH /api/items/[itemId]` endpoint. Delete `src/components/ItemEditModal.tsx` and the
`editing`/`setEditing` state plus its render branch in `ItemCard.tsx` (`ItemCard.tsx:23`,
`ItemCard.tsx:56-58`, `ItemCard.tsx:64`). The only UI affordance that previously opened the modal
(the "Edit" text link at `ItemCard.tsx:56-58`) goes away too — there's no single "edit" entry point
anymore, just per-field click targets, which is the point of this redesign.

### 2.6 API interaction — confirm what already works

`PATCH /api/items/[itemId]` (`src/app/api/items/[itemId]/route.ts:18-54`) already:
- Accepts a **partial** JSON body — each `if (typeof body?.field === ...)` check is independent,
  so sending `{ price: 42 }` alone does not touch `title`/`description`/etc. **No API changes
  needed.**
- Returns the full updated item shape, which is convenient but not required, since each inline
  field already knows its own new value optimistically.

**Recommended pattern**: each inline field fires its own small PATCH with a single-key body (e.g.
`{ title: "New name" }`, `{ price: null }` to clear), not a batched save. This matches the
per-field independence in section 2.1 and avoids introducing a "dirty fields" tracker across the
whole card. Cost: N fields edited in sequence means N network round-trips instead of 1 — acceptable
given these are small, infrequent, single-field edits (not a bulk-editing UI).

Trade-off to note but not act on now: this generates more `router.refresh()` calls (one per field
saved) if each inline component calls `router.refresh()` after its own save, which triggers a
server component re-render of the whole item list. For v1 of this feature that's fine (matches
existing `handleDelete`/`QuickAddItemForm` behavior, which already does this per-action). If this
becomes a perceptible perf issue later, consider optimistic local state update without an
immediate full-page `router.refresh()`, refreshing only on navigation/unmount — flag as a
follow-up, not part of this PR.

### 2.7 Shared types cleanup (small, do alongside this work)

`ItemCard.tsx:8-17`'s `ItemCardProps` and the retired `ItemEditModal.tsx:7-15`'s `ItemFields` are
near-duplicate local types, and `PublicItemCard.tsx:6-15` has a third near-identical copy. Since
`ItemEditModal.tsx` is being deleted anyway, take this opportunity to promote a single `ItemFields`
(or `WishlistItemView`) type into `src/types/index.ts`, and have `ItemCard.tsx` and
`PublicItemCard.tsx` both import it instead of declaring their own. Not strictly required for the
inline-edit feature to work, but it's a natural, low-risk cleanup to bundle into the same PR since
this PR is already touching `ItemCard.tsx` end-to-end.

### 2.8 Delete control placement (note only — restyling itself lives in the companion doc)

Card layout today is `flex items-start justify-between` with the delete/edit buttons grouped in a
`flex shrink-0 gap-3` div on the right (`ItemCard.tsx:55-62`). Once "Edit" (the text link) is gone
per 2.5, that right-hand action cluster shrinks to just "Delete" alone. Recommendation for this PR:
keep Delete in the same top-right corner slot (don't invent a new location), just remove the "Edit"
sibling — the actual red-to-calmer-color restyling of that button is scoped to
`PLAN_AUTOPARSE_AND_QUICK_FIXES.md` since the user grouped it with the other quick fixes. Land
whichever PR ships first with a plain, unstyled-beyond-existing Delete link in that corner; the
other PR's restyle applies on top regardless of order.

## 3. Onboarding / guidance plan

### 3.1 Where it lives

No existing guidance exists anywhere in `src/app/**/*.tsx`. Three concrete insertion points,
purely additive (no routing changes):

1. **Dashboard empty state** — `src/app/dashboard/page.tsx:32-34` currently renders just `<p
   className="text-sm text-gray-500">No wishlists yet — create your first one above.</p>` when
   `wishlists.length === 0`. Expand this into a slightly richer first-run block (still
   conditional on the empty state, so it never nags returning users with existing wishlists):
   a short 2-3 line explainer above or below the existing sentence.

2. **Wishlist detail empty state** — `src/app/wishlists/[id]/page.tsx:46-48`, same pattern:
   `No items yet — add your first one above.` gets a one-line addition explaining the quick-add
   field accepts just a name, and that details (link, price, priority) can be filled in later by
   clicking on the item once created (ties directly into the new inline-edit affordances from
   section 2 — this is a good place to plant the "click any field to edit" mental model).

3. **A persistent, small, dismissible-per-item-not-globally help affordance** — recommend
   **against** a global "hasSeenOnboarding" flag/modal for v1. Reasoning: this app's whole ethos
   (per the grounding notes: leanest option chosen repeatedly, frictionless positioning) argues for
   copy that's contextual and disappears naturally once the empty state it's attached to is no
   longer empty, rather than new persistent state (a dismissal flag needs either a DB field on
   `User`, a cookie, or `localStorage`, all of which is more infra than the guidance itself). Purely
   presentational, conditioned on data already being fetched (`wishlists.length === 0` /
   `items.length === 0`), meaning **no new state, no new model fields, no new API routes**.

4. Optional smaller addition: a one-line hint under the `QuickAddItemForm` input itself (not just
   in the empty state) — e.g. small `text-xs text-gray-400` caption — since a returning user with
   existing items will still see the quick-add form on every visit and might not know it also
   accepts a pasted URL once `PLAN_AUTOPARSE_AND_QUICK_FIXES.md` ships. Keep this copy generic for
   this PR ("Add an item by name — you can fill in details after") and let the autoparse PR update
   it once that feature exists, to avoid this PR promising a capability it doesn't yet ship.

### 3.2 Sample copy (matching the app's frictionless/flexible tone)

Dashboard empty state (`src/app/dashboard/page.tsx`):
```
No wishlists yet — create your first one above.
Add items with just a name, then fill in links, prices, or how flexible you are whenever you
get around to it.
```

Wishlist detail empty state (`src/app/wishlists/[id]/page.tsx`):
```
No items yet — add your first one above.
Just a title is enough to start. Click on an item afterward to add a link, price, priority, or
how much you'd like an exact match versus something similar.
```

Quick-add caption (`src/components/QuickAddItemForm.tsx`, small text under the input row):
```
Just a name is fine — add details later by clicking the item.
```

Share-link context (optional, `src/app/wishlists/[id]/page.tsx` near `CopyShareLink`) — since
there's currently zero explanation of what "share" does for a first-time user:
```
Share this link with anyone — they can mark items as purchased without needing an account.
```

### 3.3 State requirements

None. All of the above is derived purely from data already loaded server-side (`wishlists.length`,
`items.length`) — no new DB fields, no client state, no cookies/localStorage, no new API routes.
This keeps the guidance feature genuinely zero-risk to ship and trivially reversible (delete the
JSX, nothing else to clean up).

## 4. Implementation sequencing

1. Promote shared `ItemFields` type into `src/types/index.ts` (section 2.7).
2. Build `src/components/inline/InlineEditableText.tsx` and
   `src/components/inline/InlineEditableSelect.tsx` as standalone, testable primitives (no
   `ItemCard` dependency yet).
3. Rewrite `src/components/ItemCard.tsx` to compose the six fields from the new primitives per the
   table in 2.2; remove the `editing` state and the `<ItemEditModal>` render branch.
4. Delete `src/components/ItemEditModal.tsx`.
5. Add the onboarding copy to `src/app/dashboard/page.tsx` and `src/app/wishlists/[id]/page.tsx`
   empty-state branches, plus the optional quick-add caption.
6. Manual verification pass (see below) — no automated test suite exists in this repo today, so
   this stays a browser-driven smoke test, consistent with how `IMPLEMENTATION_CHECKLIST.md`
   documented v1's own verification.

## 5. Verification checklist for the eventual PR

- Click each of title/description/url/price/priority/matchPreference on an existing item; confirm
  each opens its own isolated inline editor, Enter/blur saves it, Escape discards it, and a page
  refresh shows the persisted value.
- Confirm an empty optional field shows its ghost affordance, and clicking it opens directly into
  edit mode (not a two-step "click to reveal, click again to edit").
- Confirm title cannot be saved empty (client-side block plus confirm server-side silently ignores
  it, matching current behavior).
- Confirm concurrent edits to two different fields on the same item both persist (no lost update —
  this works "for free" since each field PATCHes independently with only its own key).
- Confirm dashboard and wishlist-detail empty states show the new copy only when actually empty,
  and disappear once a wishlist/item exists.
- 375px mobile width pass (matches the existing convention noted in
  `IMPLEMENTATION_CHECKLIST.md` item 14) — inline inputs must not overflow the card.

## 6. Open questions to flag for the implementer (not blocking, but worth a decision at PR time)

- Should `url`'s read-state "Link" anchor text change to show the actual hostname (e.g.
  `amazon.com`) now that the field is more prominent? Out of scope here, but adjacent — mention to
  the person who eventually builds `PLAN_AUTOPARSE_AND_QUICK_FIXES.md` since autoparsed titles may
  make the raw "Link" label feel redundant.
- Whether `InlineEditableText`'s `textarea` (description) should auto-grow with content vs. a
  fixed `rows={2}` — cosmetic, defer to implementer's taste, existing modal used a fixed `rows={2}`
  so that's the safe default to carry over.

## Critical Files for Implementation

- src/components/ItemCard.tsx
- src/components/ItemEditModal.tsx (to be deleted)
- src/app/api/items/[itemId]/route.ts
- src/types/index.ts
- src/app/dashboard/page.tsx
- src/app/wishlists/[id]/page.tsx
