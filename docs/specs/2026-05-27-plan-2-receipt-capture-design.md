# Plan 2 — Receipt Capture + Item Editing — Design Spec

**Date:** 2026-05-27
**Status:** Approved (user-approved 2026-05-27)
**Parent spec:** [`2026-05-17-design.md`](./2026-05-17-design.md)
**Author:** Bauer Lee (with Claude as co-founder)

---

## Goal

Host taps "New bill" → captures or uploads a receipt photo → Tesseract.js parses it in-browser → host sees an editable list of items + tax/tip → taps "Save bill" → returns to dashboard with the bill saved as a draft.

**Plan 2 stops here.** Assigning items to participants, computing per-person totals, and sending Venmo links are deferred to Plan 3+.

## Why this scope

Plan 2 ends at a natural decision gate. Once the host can snap a real receipt and see parsed items, we have empirical data on Tesseract.js accuracy. Per the parent spec's risk section, if accuracy is unusable (<50% on real receipts), the pre-approved $20 budget unlocks switching to Claude vision. If it's good enough, the $0 thesis stays intact. Either way, we avoid building participants/assign/Venmo on top of an OCR layer that might need to be swapped.

## User flow

1. Dashboard **"New bill"** button (currently disabled) → navigates to `/new`
2. `/new` renders a single primary button: **"Take a photo"**. Uses `<input type="file" capture="environment">` — triggers the camera on phones, falls back to file picker on desktop. One pattern works everywhere.
3. After image selected → loading state (**"Reading receipt…"**)
4. Tesseract.js runs in-browser (target: 2–4s on a modern phone) → returns parsed items + raw text
5. **Edit screen** renders:
   - Bill name field (defaults to "Untitled bill", editable)
   - Items list: each row shows name (text input), qty (number), unit price (currency input)
   - Tax field, tip field
   - Subtotal auto-computed from items, total auto-computed from subtotal + tax + tip
   - "+" button to add a blank item
   - Swipe-left on a row to delete it
6. Tap **"Save bill"** → POST to `/api/splits` → creates split + split_items in DB → toast confirms → navigates back to `/dashboard`
7. Dashboard now lists saved bills under a **"Drafts"** section (added in this plan)

**Target time:** under 30s from `/new` to "Saved" for a typical receipt with no edits.

## Architecture

### New routes

| Path | Responsibility |
|---|---|
| `/new` | Single page, internal state machine: `capture → loading → edit → saving` |
| `/api/splits` (POST) | Creates a new split + child split_items rows in one transaction |

### New code

| Path | Responsibility |
|---|---|
| `src/lib/ocr/types.ts` | `ParsedReceipt`, `ParsedItem`, shared types |
| `src/lib/ocr/tesseract.ts` | Tesseract.js wrapper. Lazy-loaded. Loads worker, processes image, returns raw text. |
| `src/lib/ocr/parser.ts` | Raw text → `ParsedReceipt`. Heuristics for prices, totals, header noise. Pure functions, easy to unit test. |
| `src/components/ReceiptCapture.tsx` | Capture button. Wraps the file input + camera trigger. |
| `src/components/ItemEditor.tsx` | Items list with inline editing. Handles add, edit, delete. |
| `src/components/DraftsList.tsx` | Renders the host's draft bills on the dashboard. |
| `src/app/new/page.tsx` | Page-level state machine. Calls Tesseract, holds parsed state, posts to API. |
| `src/app/api/splits/route.ts` | POST handler. Validates payload, inserts split + items in transaction, returns split id. |

### Modified code

| Path | Change |
|---|---|
| `src/app/dashboard/page.tsx` | Enable "New bill" button (currently disabled), add `<DraftsList />` |

### Bundle strategy

Tesseract.js + its WebAssembly worker is ~10MB. Without care, this bloats the main bundle and slows every page load. Mitigation: `src/lib/ocr/tesseract.ts` is only imported via dynamic `import()` from `/new/page.tsx`. Other routes never pull it.

### Data model usage

Plan 2 writes to two tables only:

- `splits` — one row per saved bill. `host_user_id` from session, `name` from the form, `subtotal`/`tax`/`tip` from the form, `status: 'open'`.
- `split_items` — one row per line item, references the split.

Plan 2 **does not** touch:
- `participants` — empty until Plan 3
- `item_assignments` — empty until Plan 3
- `receipts` — deferred. The photo lives in browser memory only during the session; no Supabase Storage upload yet. Adding storage is a separate decision (cost: free tier covers it, but adds complexity not needed for Plan 2's exit criteria).

### State strategy

No DB writes during edit. Client-side React state holds the parsed receipt + user edits until the "Save bill" click. Rationale:

- If user backs out mid-edit, nothing pollutes the DB
- No "draft splits with no items" orphans
- Simpler — one API call at the end, not live-sync per keystroke

The tradeoff: if the user closes the tab mid-edit, the parsed receipt is lost and they re-shoot. That's acceptable for a 30s flow.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Tesseract bundle bloats main app | Dynamic `import()` in `/new` only; verify with `next build` bundle analyzer output |
| Tesseract accuracy unusable on real receipts | Spec'd fallback: 3–5 real receipt tests after Plan 2 ships; if <50% accuracy, switch to Claude vision per parent spec's $20 budget clause |
| Tesseract returns 0 items / crashes | Render empty edit screen with "Add items manually" prompt — user types items by hand |
| iOS Safari camera permission flakiness | Use the standard `capture="environment"` attribute (not `getUserMedia`) — most reliable cross-browser pattern |
| Long-running OCR locks UI | Tesseract.js uses a Web Worker by default; main thread stays responsive. Spinner + cancel button if perceived hang. |

## Out of scope (defer to Plan 3+)

- Participants — adding names, phone, Venmo handles
- Item assignment UX (tap-item-then-checkboxes-of-people)
- Per-participant total computation, tax/tip allocation algorithms
- Venmo deep-link generation, Web Share integration
- Receipt image upload to Supabase Storage
- Reminders, Web Push
- Edit-after-save (Plan 2 only supports edit-before-save; once saved, the bill is frozen for now)
- Categorization, AI-assisted reminders, Chrome Prompt API

## Testing

- **Unit (vitest, new in this plan):**
  - `src/lib/ocr/parser.test.ts` — given known receipt text strings (3–5 fixtures from real-world examples), parser returns expected item array. Covers happy path, "totals line not parsed as item", "qty handling", "tax line skipped".
- **Manual dogfooding:**
  - 3 real receipts (Phi Psi dinner, Coupa cafe, dorm late-night). Capture accuracy %, log to build-log.md. **This is the data point that decides Tesseract vs Claude vision.**
- **No e2e in this plan.** Adding Playwright now is premature; will add it when the full magic-moment flow ships in Plan 4.

## Plan 2 exit criteria

A new user can:
1. Sign in
2. Tap "New bill" on the dashboard
3. Take or upload a receipt photo
4. See parsed items on the edit screen (with some accuracy errors expected)
5. Edit any item's name, qty, or price; add new items; delete items; set bill name, tax, tip
6. Tap "Save bill" and see the bill listed on the dashboard
7. Refresh the dashboard and the saved bill is still there

**Not in exit criteria (deferred):** opening a saved bill to see/edit it again, assigning items to people, sending payment links.

## What this enables

Plan 3 inherits a populated `splits` and `split_items`. Plan 3's job is participants + assignment + per-person totals. Plan 4 is Venmo + share.

---

## Next step

Convert this spec into a concrete Plan 2 task-level implementation plan via `superpowers:writing-plans`. Plan goes to `docs/plans/2026-05-27-plan-2-receipt-capture.md`.
