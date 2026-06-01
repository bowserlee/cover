# Plan 4 — Venmo Deep Links + Web Share + Per-Person Send — Design Spec

**Date:** 2026-06-01
**Status:** Approved (user-approved 2026-06-01)
**Parent spec:** [`2026-05-17-design.md`](./2026-05-17-design.md)
**Prior plans:** [`2026-05-27-plan-2-receipt-capture-design.md`](./2026-05-27-plan-2-receipt-capture-design.md), [`2026-05-30-plan-3-assignment-design.md`](./2026-05-30-plan-3-assignment-design.md)
**Author:** Bauer Lee (with Claude as co-founder)

---

## Goal

Wire up the "Continue to send" button on the assign screen so a host can complete the bill-split loop end-to-end: navigate to a per-person send list, tap each person's Send button to open the native share sheet with a prefilled message + Venmo deep link, and mark people paid as they settle.

**Plan 4 completes the v1 magic-moment loop.** After this plan, Cover is a fully functional bill-splitting product. Reminders + Web Push notifications are Plan 5.

## Why this scope

Plans 1–3 built everything *up to* the moment of asking people for money. Plan 4 is the moment of asking. It's also the last piece of code separating Cover from being usable at a real dinner.

The decision to include "Mark paid" tracking in Plan 4 rather than bundling it with reminders is intentional: it makes the loop feel closed even before reminders exist. A host can send messages, friends pay back via Venmo/cash/whatever, host marks them paid. That's a complete usable flow. Reminders are an enhancement on top.

## User flow

1. Host finishes assigning on `/split/[id]` → taps **"Continue to send"** (button is now active)
2. Navigates to `/split/[id]/send`
3. **First-time gate:** if the host has no `venmoHandle` in their profile, redirect to `/profile?redirectTo=/split/[id]/send` to set it. Once set, return to send screen.
4. Send screen renders:
   - Bill name + grand total at top
   - One **PersonCard** per participant, in order: name, amount owed, Venmo handle (if any), [Send] button, [Mark paid] checkbox
5. Host taps **Send** on a person's row → calls `navigator.share()` with a prefilled message:
   > *"Hey Alex — your share of Coupa lunch is $14.20. Venmo me here: https://venmo.com/bauerlee?txn=pay&amount=14.20&note=Coupa+lunch"*
6. Native iOS/Android share sheet appears → host picks iMessage / SMS / WhatsApp / etc. → message goes out
7. Returns to send screen → can tap **Mark paid** when the friend Venmo's back
8. Once all are paid, the host can navigate back; split status auto-updates to `closed` (cosmetic — does not block anything)

**For participants without a Venmo handle:** the share message still goes out, just without the Venmo link. They can Venmo / Zelle / cash / whatever. Message becomes:
> *"Hey Alex — your share of Coupa lunch is $14.20."*

**Web Share API fallback:** if `navigator.share` is not available (older browsers, some desktop), fall back to copy-to-clipboard with a toast saying "Message copied — paste it into your text app."

## Venmo URL pattern

From parent spec line 224–226:

```
https://venmo.com/{recipient-handle}?txn=pay&amount={amount}&note={url-encoded-note}
```

**Critical:** the URL says "pay this person." The recipient is the **host**, not the participant. Participants are paying the host back. So we use the host's Venmo handle from their profile.

The URL opens Venmo on phones with the app installed; falls back to web Venmo otherwise. The recipient still taps "Send" in Venmo — there is no public API to auto-execute payment (industry standard, including Splitwise).

## Share message template

```
Hey {participantName} — your share of {billName} is ${amount}.{maybeVenmoLink}
```

Where `{maybeVenmoLink}` is `\nVenmo me here: {url}` if host has a handle, otherwise empty.

Single source of truth in `src/lib/venmo/message.ts`. Unit-tested.

## Architecture

### New routes

| Path | Method | Responsibility |
|---|---|---|
| `/split/[id]/send` | GET | Send list page — server component loads bill + participants + computes per-person amounts |
| `/profile` | GET | Set/edit host's Venmo handle |
| `/api/profile` | PUT | Update profile (Venmo handle) |
| `/api/splits/[id]/participants/[participantId]/paid` | PUT | Toggle a participant's paid status |

### New code

| Path | Responsibility |
|---|---|
| `src/lib/venmo/url.ts` | Pure function: build a Venmo URL from recipient + amount + note |
| `src/lib/venmo/url.test.ts` | Unit tests for URL encoding edge cases |
| `src/lib/venmo/message.ts` | Pure function: build the share message text |
| `src/lib/venmo/message.test.ts` | Unit tests for message text |
| `src/lib/share/web-share.ts` | `nativeShare(text)` wrapper — uses Web Share API, falls back to clipboard with toast |
| `src/app/split/[id]/send/page.tsx` | Server component — loads bill, items, participants, assignments; computes per-person totals; checks profile has Venmo handle (redirect to /profile if not) |
| `src/app/split/[id]/send/SendClient.tsx` | Client component — renders PersonCards, handles send + mark-paid actions |
| `src/components/PersonCard.tsx` | One person row: name, amount, Venmo handle, Send button, Mark paid checkbox |
| `src/app/profile/page.tsx` | Server component — load current profile, render client form |
| `src/app/profile/ProfileForm.tsx` | Client form for setting Venmo handle, with `redirectTo` support |
| `src/app/api/profile/route.ts` | PUT handler — upsert the host's profile row |
| `src/app/api/splits/[id]/participants/[participantId]/paid/route.ts` | PUT handler — toggle paid status |

### Modified code

| Path | Change |
|---|---|
| `src/app/split/[id]/AssignmentClient.tsx` | Enable "Continue to send" button — wrap in `<Link href="/split/{id}/send">` instead of `disabled` |

### Data model usage

Plan 4 reads from `splits`, `split_items`, `participants`, `item_assignments` (all populated by Plans 2 + 3). It also:
- Reads + writes `profiles` (for host's Venmo handle) — table created in Plan 1 but unused until now
- Writes `participants.paid` (column exists, currently always false)

### Server-side computed amounts

The send page (server component) calls `computePerPersonTotals()` on the server before rendering. This means the amounts in PersonCards are computed once on the server, not duplicated in client logic. Client just renders them. This avoids the risk of "client shows X, server-generated Venmo URL says Y" desync.

### Optimistic mark-paid

When the host taps "Mark paid," the client immediately toggles the UI and fires the PUT. If the server returns an error, we revert with a toast. Standard optimistic pattern.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| `navigator.share` not available on desktop | Detect at runtime, fall back to clipboard copy with explicit toast |
| Venmo URL encoding wrong (special chars in note) | Always `encodeURIComponent()` the note + handle. Unit-tested. |
| Host changes their Venmo handle mid-flow | Server reads profile fresh on each `/send` render. Old shared messages don't auto-update — that's correct behavior. |
| User taps "Mark paid" then realizes they meant someone else | Toggle is just a click — unchecking reverses it. No confirm needed. |
| URL too long for SMS | Venmo URLs are ~80 chars + message ~50 chars = ~130 chars total. Well within SMS limits. |
| Profile gate creates an annoying redirect loop | The gate is one-time per session — once `venmoHandle` is set, no further redirects. URL has `redirectTo` param so host returns to where they were. |

## Out of scope (defer to Plan 5+)

- Reminders / Web Push notifications (Week 6 in parent spec)
- Auto-close split when all paid (currently cosmetic; doesn't matter for functionality)
- Bulk send / group message ("send to everyone at once")
- Editing the share message before sending
- Multi-currency
- "Forgot to pay" follow-up flows
- Multiple Venmo handles per host (work + personal)
- Removing the participant `paid` toggle while assignments exist for them (currently allowed)

## Testing

- **Unit (vitest):**
  - `url.test.ts` — Venmo URL builder: simple case, special chars in handle, special chars in note, edge cases (zero amount, very long note)
  - `message.test.ts` — message builder: with Venmo link, without Venmo link, amount formatting, name with special chars
- **Manual:**
  - Happy path on desktop Chrome — click Send, see share sheet → cancel (don't actually message yourself)
  - Test the Web Share fallback by ensuring clipboard copies the message
  - Profile gate: clear venmoHandle in Supabase, visit /send, confirm redirect to /profile
  - **Critical:** test on a real iPhone — open production URL, install as PWA, do a full send flow with at least one real friend. This is THE final smoke test.

## Plan 4 exit criteria

A user can:
1. Sign in, snap a receipt, edit items, save bill — Plans 1–2 flow ✓
2. Add 2+ participants, assign items, see totals — Plan 3 flow ✓
3. Tap "Continue to send" → land on `/split/[id]/send` (after one-time profile setup)
4. See each participant with their amount and Send button
5. Tap a Send button → native share sheet pops up with prefilled message + Venmo link
6. Pick a share target → message sends correctly
7. Tap "Mark paid" → checkbox stays, persists in DB
8. Refresh — paid statuses still there
9. On desktop without `navigator.share` — clicking Send copies the message to clipboard with a toast
10. New host (no Venmo handle yet) gets redirected to /profile on first /send visit

## What this enables

Cover v1 complete. After Plan 4, the product can actually be used at a dinner table. Plan 5+ becomes polish, reminders, settle automation, real PWA icons, design refinement, the build-log artifact for class. The 10-week timeline now has 6 weeks of buffer.

---

## Next step

Convert this spec into a concrete Plan 4 task-level implementation plan via `superpowers:writing-plans`. Plan goes to `docs/plans/2026-06-01-plan-4-send.md`.
