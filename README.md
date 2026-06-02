# Cover

**Split the bill in 30 seconds.**

Snap a photo of the receipt, tap who had what, and Cover sends each friend a personalized Venmo link with the exact amount they owe — all from your phone. No more one person fronting the bill and chasing everyone for their share.

## Why I'm building this

Every time my friends and I go out to eat, someone ends up covering the bill and then has to follow up with everyone to get paid back. Most restaurants only split checks 2–3 ways, and following up feels awkward. Cover fixes that.

This is also a class project, built around a specific thesis:

> *Splitwise was built by a small team in 2011 and took years to reach product-market fit. In 2026, one freshman with modern AI coding tools is rebuilding the core product solo in 10 weeks — for ~$5 in lifetime AI API costs.*

The product is intentionally not new. The point is to demonstrate the asymmetry between what a team had to do in 2011 and what one person can do in 2026.

### On the "$5" instead of "$0"

The original spec targeted $0 ongoing API costs, using Tesseract.js (an open-source OCR library) to read receipts in-browser. The spec also included a documented escape valve: *"if Tesseract is unusable on real receipts, authorize a one-time $20 budget to swap to a paid AI vision API."* That trigger fired in Week 3 — Tesseract got "basically none of the items correct" on a real test receipt. The swap to Claude Haiku 4.5 vision took it to ~95% accuracy with the parsing logic deleted entirely (the model returns structured JSON directly). Total projected API cost for the full 10-week class: under $5.

This is the better thesis. **Using an AI model to do what 2011 needed hand-tuned heuristics for** is more on-point than dogmatically holding to $0. The decision was pre-authorized in the spec from day 1; pulling the trigger took 60 minutes.

## Status

**Week 3 of 10 (calendar).** v1 feature-complete and in production. Original 10-week scope (Weeks 1–9 in the spec) is shipped, leaving the final weeks for usage feedback + presentation prep.

**Full end-to-end loop:**

1. Sign in with Google
2. Snap or upload a receipt — Claude Haiku 4.5 vision parses it in ~3s
3. Edit items if anything's off (price, quantity, name)
4. Save as a draft bill
5. Open the bill, add people — either type new participants or one-tap from your saved **Friends** roster
6. **Select a person at the top → tap items to assign them** (faster than the modal pattern most bill-split apps use)
7. Watch per-person totals reconcile live (proportional tax + tip allocation)
8. Send each person a personalized Venmo link via the native share sheet
9. Mark them paid as they pay — when all paid, the bill auto-archives to `/settled`

Remaining: optional Web Push reminders (Plan 6 if needed), design polish pass, the actual launch + class presentation.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind 4
- Supabase (Postgres + Google OAuth)
- Drizzle ORM
- **Claude Haiku 4.5 vision** for receipt OCR (~$0.003/receipt)
- Web Share API for native share sheets
- PWA shell — installable on iOS Safari and Android Chrome
- Sharp for programmatic icon generation
- Vercel hosting on the free tier
- Vitest for unit tests (15 passing)

## Routes

| Route | What it does |
|---|---|
| `/login` | Google OAuth sign-in |
| `/dashboard` | Open bills + nav to other sections |
| `/new` | Capture or upload receipt → AI OCR → edit |
| `/split/[id]` | Add people + assign items + see live totals |
| `/split/[id]/send` | Per-person send list with Venmo links + Paid toggle |
| `/friends` | Persistent friends roster (name + phone + Venmo) |
| `/settled` | Archive of bills where everyone has paid |
| `/profile` | Set your own Venmo handle |

## Live

**Production:** https://cover-nine-psi.vercel.app

**Install on iPhone:** open the URL in Safari → Share → Add to Home Screen. Opens fullscreen like a native app, auto-updates on every git push.

## Who this is for & potential use cases

Cover targets the exact moment friction shows up in real life: a group meal where one person fronts the bill. Direct use cases:

- **College students** splitting dinners, lunches, late-night food runs (the original motivating use case — Phi Psi at Stanford)
- **Roommates** with rotating "I'll grab this one" dynamics
- **Travel groups** settling up at the end of a trip without the awkwardness
- **Anyone who's the "designated card"** at a meal and tired of chasing Venmos for the next three days

The wider claim: most existing tools (Splitwise, Plates, Tricount) assume both sides install an app and create accounts. Cover only requires the host to sign in. Participants get a Venmo link via SMS / iMessage / WhatsApp without ever signing up — drastically lower friction, which is what makes a friend group actually adopt it.

## What I'd add next

If I had more time:

- **Web Push reminders** for unpaid balances (nudge the friend who hasn't paid 48 hours later — auto-disabled once they're marked paid)
- **Settle automation** that nets cross-bill totals between the same friends (you owe Alex $12 from last week, Alex owes you $8 from today → just $4 owed)
- **Plate-photo AI assignment** — one overhead photo of the table → Claude vision figures out who ate what
- **Receipt image storage** so the host can revisit and re-edit a bill later if a friend disputes a charge
- **Recurring bills** (rent, utilities) — different mental model from one-off restaurant bills, would need a separate flow
- **Tax/tip per-participant override** for cases where one person had a dish that was tax-exempt (alcohol in some jurisdictions, etc.)

## Known limitations

Honest about what doesn't (yet) work:

- **OCR can mis-parse faded thermal-paper receipts**, low-light photos, or receipts with heavy decorative borders. Claude Haiku 4.5 vision is ~95% on typical restaurant receipts; the edit UI assumes some manual correction will happen.
- **Venmo deep-links don't auto-execute payments.** They open the Venmo app with recipient + amount + memo pre-filled, but the recipient still taps "Send." This is industry standard — including Splitwise. No public Venmo API exists to bypass this.
- **No automated Zelle support.** Phone numbers are stored on participant + friend records for the host's reference, but Zelle has no public URL scheme so it can't be deep-linked the way Venmo can.
- **No offline mode.** Cover installs as a PWA but reads/writes still hit Supabase. Going offline mid-flow breaks save.
- **Single-host model.** Only the bill creator has an account; participants receive links via share sheet but don't sign up. If a participant wants their own running tab view across multiple hosts, that's not supported yet.
- **No image storage.** Receipt photos are parsed in memory, used to populate the edit screen, and discarded. The text content survives in the DB; the photo itself doesn't.

## AI tools & disclosure

Per the CS 153 AI policy, full disclosure of how AI was used:

- **Claude Code (Claude Opus 4.7)** was the primary coding partner across all 3 weeks of active development. Estimated ~90% of the code in this repo was AI-generated. Architecture decisions were collaborative — I drove the product direction (what to build, when to swap OCR engines, how the assignment UX should feel) and Claude implemented and iterated. Build-log entries describe the specific moments where Claude pushed back on my plans (e.g., reminding me to pressure-test the OCR pivot, surfacing the spec's pre-authorized $20 budget) and where I pushed back on Claude (e.g., the assignment UX rewrite after the modal version was too slow).
- **Claude Haiku 4.5 vision** is the runtime OCR engine — every receipt the app processes goes through one Anthropic API call. This is the only paid AI usage and the source of the projected ~$5 in lifetime API costs.
- **No code was forked or copy-pasted from other repos.** The Supabase auth + Drizzle ORM setup was ported from a previous personal project ([Conductor](https://github.com/bowserlee/conductor)) — same author, same patterns — but written fresh for Cover. Everything else in this repo is original.
- **Dev tools used:** Vercel for hosting, Drizzle Kit for migrations, Supabase web SQL editor as a fallback when the pooler connection failed locally, pnpm for package management.

## Design + plan

Specs live at [`docs/specs/`](./docs/specs/). Phased implementation plans live at [`docs/plans/`](./docs/plans/). Class artifact at [`docs/build-log.md`](./docs/build-log.md).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
pnpm db:migrate
pnpm dev
```
