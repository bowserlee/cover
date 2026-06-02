# Plan 5 — Friends List + Bill-Time Quick-Add — Design Spec

**Date:** 2026-06-01
**Status:** Approved (user-approved 2026-06-01)
**Parent spec:** [`2026-05-17-design.md`](./2026-05-17-design.md)

---

## Goal

Add a persistent "friends" roster so the host can build up a list of regulars (name + optional phone for Zelle + optional Venmo handle) and quick-add them to any bill from the assignment screen with one tap. Reduce the friction of retyping the same friend's details for every meal.

## Mental model

- **Friends** = persistent roster, lives at `/friends`, available across all bills
- **Participants** = who's on a specific bill (existing concept, unchanged)
- Adding to a bill: tap a friend chip OR add a new person (with optional "Save to friends" checkbox)

## Snapshot semantics

When you add a friend to a bill, their name/phone/venmo are **copied** into the participant row. Updating a friend later does NOT propagate to past bills. This is correct: a bill that already went out shouldn't retroactively change.

## Data model

New table `friends`:

```ts
friends {
  id: uuid (primary key)
  userId: uuid (FK to auth.users, indexed)
  name: text (not null)
  phone: text (nullable)
  venmoHandle: text (nullable)
  createdAt: timestamp
}
```

No FK from `participants` to `friends`. Snapshot model means no need to link.

## Routes

| Path | Method | Responsibility |
|---|---|---|
| `/friends` | GET (Server Component) | List page with inline add/edit/remove |
| `/api/friends` | GET | List the user's friends |
| `/api/friends` | POST | Create a friend |
| `/api/friends/[id]` | PATCH | Update name/phone/venmoHandle |
| `/api/friends/[id]` | DELETE | Remove a friend (past bills unaffected) |

## UI changes

### Dashboard header

Add **Friends** link next to existing Settled + Profile + Sign out.

### `/friends` page

- Add form at top: name (required), phone (optional), venmo (optional), Save button
- List below: one row per friend. Tap → expands to inline edit form. Remove button on each row with confirm.

### `/split/[id]` assignment screen — "People" section

Three layers:

1. **Existing participants** — current chip UI (unchanged)
2. **Quick-add from friends** — small chips showing friends NOT yet on this bill. Tap a chip → adds them as a participant (snapshot copy of friend's fields)
3. **+ Add new person** button (existing) — opens AddParticipantForm with a new **"Also save to friends"** checkbox at the bottom (default: unchecked)

If a user has no friends saved yet, layer 2 is hidden.

### Send flow

No changes. Phone is stored on the participant row for the host's reference but doesn't appear in share messages (per user decision — Zelle has no deep-link, so adding text without automation gain is noise).

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Friends list grows large, chips clutter assignment screen | Acceptable for v1. If a user has 20+ friends, we can add recency sorting in Plan 6. Pre-mature now. |
| Duplicate friends (typing "Alex" twice) | No dedup. User can edit/remove from `/friends` page. |
| User deletes a friend who's on past bills | Past bills unaffected (snapshot). No prompt needed. |
| Friend has the same name as a one-off participant on a bill | Both coexist as separate participants. Item-assign modal shows both with name labels; user disambiguates visually. |

## Out of scope (defer)

- Importing phone contacts
- "Recently used" sorting / pinning frequently used friends
- Sharing friends across Cover users
- Editing friend details from inside a bill (only via `/friends`)
- Zelle URL generation (no public scheme exists)
- Bulk operations (add multiple friends at once)

## Exit criteria

1. Visit `/friends` from dashboard → add 3 friends with names + handles
2. Open a bill → see those 3 friends as chips below the empty participants section
3. Tap a friend chip → they appear as a participant
4. Add a new person via the form with "Save to friends" checked → they appear both on the bill AND on /friends
5. Item assignment modal: only shows the bill's participants, NOT the friends roster
6. Delete a friend from /friends → past bills where they participated are unchanged
7. Send flow still works exactly as before
