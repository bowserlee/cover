# Cover Build Log

Tracking hours, AI tool usage, and weekly progress for the class artifact.

## Stats

| Metric | Value |
|---|---|
| Total hours worked | _[fill in weekly]_ |
| % of code AI-generated (estimated) | ~90% (Claude Code) |
| API costs to date | ~$0.30 (test receipts only) |
| Projected API cost for full 10 weeks | ~$5 |
| Real bills processed | 0 (pre-launch) |
| Users | 0 (pre-launch) |
| Vitest tests passing | 15 |

---

## Week 1 — Foundation

**Dates:** 2026-05-17 – 2026-05-27

**Goal:** Deploy a working PWA with auth, database, and PWA shell — the walking skeleton.

**Shipped:**
- [x] Project initialized (Next.js 16 + React 19 + TypeScript + Tailwind 4)
- [x] Supabase project created (West US / N. California, free tier)
- [x] Supabase client setup (browser + server, ported from prior Conductor project)
- [x] Drizzle schema with 6 tables + first migration applied
- [x] Google OAuth login flow
- [x] Auth-gated dashboard with email display + signout
- [x] Auth proxy (`proxy.ts` — Next.js 16's renamed middleware) protecting `/dashboard`, `/splits`, `/split`, `/new`
- [x] PWA manifest, minimal service worker, iOS install prompt
- [x] Deployed to Vercel free tier at https://cover-nine-psi.vercel.app
- [x] Installable on iPhone — opens fullscreen from home screen, no Safari chrome
- [x] Public GitHub repo at https://github.com/bowserlee/cover

**Architecture decisions:**
- **PWA over native:** $0 in app store fees, one codebase serves web + iPhone + Android, no App Store approval cycle. Load-bearing for the solo timeline.
- **Supabase pooler URL (port 6543), not direct (5432):** Vercel serverless functions open a new Postgres connection per request — direct URL would exhaust free-tier connection limit fast.
- **`proxy.ts` instead of `middleware.ts`:** Next.js 16 renamed the file convention. Caught from reading the node_modules docs before writing code — training data lag would've sent me to the deprecated pattern.

**Hours:** _[fill in]_

**What was hard:** _[fill in]_

**What surprised me:** _[fill in]_

---

## Week 2 — Receipt capture + OCR + item editing (Plan 2)

**Dates:** 2026-05-27 – 2026-05-30

**Goal:** Enable the host to snap or upload a receipt, get items parsed automatically, edit them, save as a draft bill.

**Shipped:**
- [x] `/new` route — single-page state machine: `capture → loading → edit → saving`
- [x] Tesseract.js wrapper with lazy dynamic import (kept the ~10MB WASM out of the main bundle)
- [x] Receipt text parser with 6 vitest unit cases (heuristics for tax/tip/subtotal lines, dollar-sign stripping, qty handling)
- [x] `ReceiptCapture` component using `<input type="file" capture="environment">` — triggers camera on phones, file picker on desktop, one pattern works everywhere
- [x] `ItemEditor` component — inline edit name, qty, price, tax, tip
- [x] POST `/api/splits` — server-side payload validation + Drizzle inserts
- [x] `DraftsList` on dashboard — server component reading saved bills

**Architecture decisions:**
- **Batch save, not auto-save:** all client-side state during editing, single API call on Save. Avoids orphan draft splits if the user backs out mid-edit.
- **Skip `receipts` table for Plan 2:** no image upload yet. Saves complexity; image storage can come later without schema changes.
- **Dynamic import for Tesseract:** other routes never pull its bundle.

**One bug caught during build:** create-next-app's `globals.css` included a `@media (prefers-color-scheme: dark)` block that flipped text to light when the OS was in dark mode. But Cover hard-codes `bg-white` everywhere, so this made inputs invisible on dark-mode systems. Removed the block entirely — Cover is intentionally light-mode only.

**Hours:** _[fill in]_

---

## Week 3 — Assignment + Send + the OCR pivot (Plans 3, 4, and the OCR swap)

**Dates:** 2026-05-30 – 2026-06-01

**Goal:** Close the full loop. Open a saved bill, add people, assign items, send Venmo links per person, mark paid. Plus: resolve the Tesseract accuracy gate.

### Plan 3 — Participants + Assignment

**Shipped:**
- [x] `/split/[id]` assignment screen
- [x] Add/remove participants (chip-style UI, inline form for name + optional phone/Venmo)
- [x] Item assignment via tap-then-checkbox-modal pattern (per parent spec)
- [x] Per-person totals math with proportional tax/tip allocation (`computePerPersonTotals`)
- [x] 7 new vitest tests covering even splits, asymmetric splits, zero-subtotal, rounding
- [x] PUT `/api/splits/[id]/assignments` — atomic transaction (delete old + insert new) per item
- [x] Auto-save on each interaction (opposite of Plan 2's batch model)

**Architecture decision:** PUT-replaces-set for assignments. Client sends the full intended participant list per item; server replaces atomically. Naturally idempotent. Server computes `shareFraction = 1/N`, client doesn't do the math.

### Plan 4 — Venmo + Web Share + Send

**Shipped:**
- [x] `/split/[id]/send` per-person send list
- [x] `nativeShare()` wrapper around Web Share API with clipboard fallback for desktop
- [x] Venmo URL builder (5 unit tests covering encoding edge cases)
- [x] Share message builder (3 unit tests)
- [x] `/profile` screen gated on first /send visit if host's Venmo handle isn't set
- [x] PUT `/api/splits/[id]/participants/[id]/paid` — toggle paid status, auto-recompute split status
- [x] `/settled` page for closed bills
- [x] Dashboard filtered to status='open' only

**Architecture decision:** Send page back button is conditional — if all paid, jump straight to /dashboard (skip the assign screen). If still open, go to /split/[id]. Matches mental model: "settled bills don't need fixing."

### The OCR pivot

The parent spec named "Tesseract OCR quality" as the top risk and pre-authorized a $20 budget to swap to a paid AI vision API if Tesseract turned out to be unusable.

**Test result:** I ran a real receipt through Tesseract. It got "basically none of the items correct." Trigger condition met.

**Swap:** ~60 minutes of work.
- New `/api/ocr` endpoint with Claude Haiku 4.5 vision
- Strict JSON-output system prompt; server validates each returned item shape
- Replaced ~100 lines of Tesseract wrapper + parser heuristics with ~30 lines of API call
- Deleted Tesseract entirely (~10MB out of the bundle)

**Result:** ~95% accuracy on the first real test ("1 thing wrong" out of multiple items). Cost: ~$0.003 per receipt.

**Reflection:** This is the better thesis. Holding dogmatically to $0 would've produced a worse product with more code. Pre-authorizing the escape valve in the spec from day 1 meant pulling the trigger was a 60-minute task, not a multi-day re-debate. **The discipline is in the spec, not in stubbornness.**

### UX fixes in same session

User feedback caught two real bugs in the ItemEditor:
1. **Qty/price visually ambiguous** — bare numbers with a `×` symbol between them. No labels. Rewrote as two-row layout per item: name + delete on top, then `Qty / Price each / Line total` labeled below with a `$` prefix on price.
2. **Number inputs prepended "0"** — typing "13" into a field showing "0" produced "013". Standard React-controlled-number-input bug. Fixed with `numberInputValue(n) = n === 0 ? "" : String(n)` + `parseNumberInput` helper.

**Hours:** _[fill in]_

---

### Plan 5 — Friends roster + bill-time quick-add

**The motivation:** the people you eat with regularly are mostly the same people. Re-typing each friend's name + phone + Venmo handle for every bill was the most annoying friction in the existing flow. Not in the original spec — surfaced from actually thinking about using the product.

**Shipped:**
- [x] New `friends` table (`id`, `userId`, `name`, `phone?`, `venmoHandle?`)
- [x] `/friends` page with add/edit/remove, accessed from dashboard header
- [x] `/api/friends` CRUD endpoints
- [x] Assignment screen shows a "+ Friend" chip row for friends not yet on the bill — tap to add as participant
- [x] AddParticipantForm grows an "Also save to friends" checkbox
- [x] Snapshot model: adding a friend to a bill copies their fields into the participant row; future friend edits don't propagate to past bills

**Local migration issue:** my home network blocks port 6543 to Supabase's pooler. `pnpm db:migrate` hung. Worked around by pasting the SQL into Supabase's web SQL Editor. Vercel reaches the pooler fine, so runtime is unaffected. Documented in memory for future me.

### Assignment UX overhaul

After Plan 5 shipped, the tap-item → modal → check-people → done flow felt slow when one person had multiple items.

**Rewrote the pattern:** participant chips are now selectable (tap = active, fills black/white). When a participant is active, tapping an item directly toggles them on/off — no modal. Optimistic UI so taps feel instant; revert on API failure. Item border + ✓ when active person is on it.

Deleted `AssignmentModal.tsx` entirely. Significantly faster for the common case.

### Real PWA icons

The placeholder solid-black icon squares were getting embarrassing. Generated a real icon: black rounded tile + white "C" arc, sized for 192/512 (PWA manifest) + 180 (apple-touch-icon for iOS).

`scripts/generate-icons.mjs` uses `sharp` to render an inline SVG to PNG at each size. First pass had wrong arc angles (made an upward-opening U); fixed by changing the end angle so the arc sweeps the long way through the left side.

### Stats this week (Week 3)

- vitest tests: still 15 passing (no new test code added in Week 3 since the changes were UI-heavy)
- Commits this week: 40+
- New routes shipped: `/friends`, `/api/friends`, `/api/friends/[id]`, `/api/ocr`, plus the existing `/split/[id]`, `/split/[id]/send`, `/profile`, `/settled` routes added earlier in the week
- Files deleted: `tesseract.ts`, `parser.ts`, `parser.test.ts`, `AssignmentModal.tsx` — total churn shows the iteration

**Hours this week:** _[fill in]_

**What was hard this week:**
- _[fill in — e.g. deciding when to actually pull the Tesseract \$20 trigger; rewriting the assignment UX after just shipping it]_

**What surprised me:**
- _[fill in — e.g. how much better Claude vision was than expected; how natural the select-person-tap-items flow felt once built]_

---

## Where Cover is now

End of Week 3 (calendar). Per the original 10-week timeline, this position covers Weeks 1–5 of planned work plus all of Plan 5 (friends, which wasn't in the original spec). **Ahead of schedule by ~3+ weeks.**

The end-to-end loop works in production for any user with a Google account: snap receipt → AI OCR → edit → assign → send Venmo links → mark paid → auto-archive when settled. Friends roster cuts the per-bill typing burden. The assignment screen lets you crank through item assignments faster than Splitwise's modal pattern.

**Cover v1 is functionally complete.** Live at https://cover-nine-psi.vercel.app.

Remaining for the class deadline:
- [ ] Use it at one real meal with real friends — the actual product test
- [ ] Fill in the Hours / What was hard / What surprised me sections (weeks 1–3)
- [ ] Class presentation deck
- [ ] Optional: Web Push reminders (only if real usage shows friends forgetting to pay)
- [ ] Optional: design polish pass (typography, animations)

---
