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

## Where Cover is now

End of Week 3 (calendar). Per the original 10-week timeline, this position was supposed to be reached at end of Week 5–6. **Ahead of schedule by ~2–3 weeks.**

The end-to-end loop works in production for any user with a Google account: snap receipt → AI OCR → edit → assign → send Venmo links → mark paid → auto-archive when settled.

Remaining for v1 release:
- [ ] Use it at a real meal with real friends (the actual test)
- [ ] Replace placeholder PWA icons (currently solid black squares)
- [ ] Reminders / Web Push (Plan 5)
- [ ] Design polish pass
- [ ] Launch announcements + first real bills tracked

---
