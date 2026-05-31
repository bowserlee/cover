# Plan 3 — Participants + Item Assignment + Per-Person Totals — Design Spec

**Date:** 2026-05-30
**Status:** Approved (user-approved 2026-05-30)
**Parent spec:** [`2026-05-17-design.md`](./2026-05-17-design.md)
**Prior plan:** [`2026-05-27-plan-2-receipt-capture-design.md`](./2026-05-27-plan-2-receipt-capture-design.md)
**Author:** Bauer Lee (with Claude as co-founder)

---

## Goal

Once a bill exists (Plan 2 output), the host can open it, add participants, assign items between them via a modal-with-checkboxes pattern, and see live per-person totals (including proportionally allocated tax + tip).

**Plan 3 stops here.** Sending Venmo links + Web Share integration is Plan 4.

## Why this scope

Plan 2 left bills sitting on the dashboard with no way to do anything useful with them. Plan 3 turns Cover into something a real person could actually use at a restaurant — every piece is there except the final "send" step. Splitting Plan 3 from Plan 4 keeps each plan small enough to ship cleanly and gives a natural pause point to validate the assign UX before adding the more complex share-sheet integration.

## User flow

1. Dashboard → tap any bill in "Your bills" list
2. Lands on `/split/[id]` — shows bill name, list of items with prices, empty participants row
3. Tap **"+ Add"** in participants section → small inline form: name (required), phone (optional), Venmo handle (optional) → tap "Add" → participant appears as a chip
4. Tap an item row → **assignment modal** opens with a checkbox per participant
5. Check who had the item → tap "Done" → modal closes, item row shows assigned-to chips
6. Repeat for each item. Shared items: multi-check ⇒ `share_fraction = 1/N` per assignee.
7. As items are assigned, the **totals section** updates live:
   - Each person's subtotal = sum of (their share of each assigned item)
   - Each person's tax + tip = proportional ((their_subtotal / bill_subtotal) × bill_tax|tip)
   - Person total = subtotal + tax + tip
8. **"Continue to send" button** at the bottom — disabled in Plan 3 (Plan 4 enables it)

## Screen layout (text mockup)

```
┌─────────────────────────────────────┐
│  ← Back          Phi Psi dinner     │
├─────────────────────────────────────┤
│  People                       + Add │
│  [Alex] [Sam] [Maya]                │
├─────────────────────────────────────┤
│  Items                              │
│  Burger          $12.50             │
│    [Alex] [Sam]                     │
│                                     │
│  Fries            $5.00             │
│    tap to assign                    │
│                                     │
│  Coke             $3.00             │
│    [Alex]                           │
├─────────────────────────────────────┤
│  Totals                             │
│  Alex     $11.43                    │
│  Sam       $9.18                    │
│  Maya     $0.00                     │
│                                     │
│  Total assigned   $20.61 / $20.50   │
├─────────────────────────────────────┤
│  [Continue to send]  (disabled)     │
└─────────────────────────────────────┘
```

The "Total assigned / Bill total" line surfaces any drift (rounding error, unassigned items) so the host notices before sending. Unassigned items count as $0 contribution to all participants — they don't disappear from the bill total.

## Architecture

### New routes

| Path | Method | Responsibility |
|---|---|---|
| `/split/[id]` | GET (Server Component) | Load split + items + participants + assignments, hand off to client component |
| `/api/splits/[id]/participants` | POST | Add a participant to the split |
| `/api/splits/[id]/participants` | DELETE | Remove a participant (blocked if they have assignments) |
| `/api/splits/[id]/assignments` | PUT | Replace the full assignment set for an item (atomic: delete old + insert new) |

PUT is used for assignments instead of POST/DELETE because the natural UX is "open modal, check/uncheck people, save." That maps to a full replacement of the item's assignment set, not incremental inserts.

### New code

| Path | Responsibility |
|---|---|
| `src/lib/split-math/types.ts` | `PerPersonTotal` shared type |
| `src/lib/split-math/totals.ts` | Pure function: split + items + participants + assignments → `PerPersonTotal[]` |
| `src/lib/split-math/totals.test.ts` | Vitest unit tests for the math |
| `src/components/ParticipantList.tsx` | Chip-style participant pills + "+ Add" trigger |
| `src/components/AddParticipantForm.tsx` | Inline form (name + optional phone/Venmo) |
| `src/components/AssignmentModal.tsx` | Modal with checkbox per participant |
| `src/app/split/[id]/page.tsx` | Server component — loads data, renders client wrapper |
| `src/app/split/[id]/AssignmentClient.tsx` | Client component — owns interactive state, calls API endpoints |
| `src/app/api/splits/[id]/participants/route.ts` | POST + DELETE handlers |
| `src/app/api/splits/[id]/assignments/route.ts` | PUT handler |

### Modified code

| Path | Change |
|---|---|
| `src/components/DraftsList.tsx` | Wrap each row in `<Link href="/split/{id}">` |

### Data model usage

Plan 3 starts populating two previously-empty tables:

- `participants` — one row per person on a bill. `name` required; `phone`, `venmo_handle` optional; `total_owed` computed and persisted on save; `paid` starts false.
- `item_assignments` — one row per (item, participant) pair. `share_fraction` defaults to `1 / number_of_assignees_for_that_item`.

Reads from `splits` and `split_items` (populated in Plan 2). Does not touch `receipts`.

### Persistence strategy

Auto-save on each change — opposite of Plan 2's batch save.

Rationale: the assignment screen is a longer interactive session (more clicks, more thinking) than Plan 2's quick-edit screen. Users will leave and come back; we can't afford to lose state. Each user action (add/remove participant, change assignment) immediately POSTs/PUTs to the API. Optimistic UI updates first, then reconciles with server response.

Tradeoff: more API calls, slightly more code. Acceptable — these are low-frequency interactions.

### Per-person totals math

In `src/lib/split-math/totals.ts`:

```
For each participant P:
  their_subtotal = sum over each assigned item I:
    (I.unit_price × I.quantity) × P's share_fraction in I
  
  their_tax  = (their_subtotal / bill.subtotal) × bill.tax
  their_tip  = (their_subtotal / bill.subtotal) × bill.tip
  their_total = their_subtotal + their_tax + their_tip
```

Edge cases the function handles:
- `bill.subtotal == 0` → tax/tip allocation is 0 for everyone (avoid divide-by-zero)
- Participant with no assignments → all zeros
- Items with no assignees → contribute 0 to everyone but still count in bill total

Rounding: each participant total rounded to 2 decimal places at the end (not per intermediate calc — keeps drift small).

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Rounding drift (sum of per-person totals ≠ bill total by $0.01) | Surface in UI as "Total assigned / Bill total" so the host sees it. Acceptable for v1. |
| Race conditions on rapid assignment changes | PUT-replaces-set pattern is naturally idempotent; last write wins. Acceptable. |
| Participant deletion mid-assignment | API blocks deletion if assignments exist; user must unassign first |
| Auto-save fails silently | Show small toast on failure; keep optimistic UI for retry |
| Modal feels heavy for big bills | Acceptable for v1; if it becomes a real problem, inline chips can replace it in Plan 5 polish |

## Out of scope (defer to Plan 4+)

- Sending Venmo links / Web Share integration
- Per-participant tax/tip override
- Removing participants with assignments (Plan 3 blocks; Plan 4 handles reassignment)
- Editing item names/prices from this screen
- Settle tracking (marking paid)
- Reminders
- Multiple share_fractions per item (e.g., "Alex had 2/3, Sam had 1/3")

## Testing

- **Unit (vitest):**
  - `totals.test.ts` — 5–7 cases covering: even split, asymmetric splits, unassigned items, zero subtotal, no participants, rounding edge cases
- **Manual:** 3-person test bill end-to-end: add participants, assign all items, verify totals sum back to bill total ± 1 cent.

## Plan 3 exit criteria

A user can:
1. Tap a saved bill on the dashboard
2. Land on the assignment screen with bill name + items pre-populated
3. Add 2–4 participants with name (+ optional phone/Venmo)
4. Tap any item, check which people had it, save the assignment
5. See per-person totals update live as assignments change
6. See "Total assigned" reconcile with the bill total (≤ $0.01 drift acceptable)
7. Refresh the page — all participants + assignments persist
8. Return to the dashboard, re-open the same bill, find everything intact
9. See the "Continue to send" button (disabled — Plan 4 wires it up)

## What this enables

Plan 4 inherits a bill with participants who each have a `total_owed` and a `venmo_handle` (where provided). Plan 4 generates per-person Venmo deep links and surfaces them through the Web Share API.

---

## Next step

Convert this spec into a concrete Plan 3 task-level implementation plan via `superpowers:writing-plans`. Plan goes to `docs/plans/2026-05-30-plan-3-assignment.md`.
