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

**Week 3 of 10 (calendar) / Week 5+ of 10 (work shipped).** The end-to-end loop is live: snap receipt → AI OCR → edit items → assign to people → send Venmo links → mark paid → auto-archive.

Functionally Cover v1 is shippable. Remaining work is polish: real PWA icons (currently placeholders), reminders/push notifications, design refinement, launch.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind 4
- Supabase (Postgres + Google OAuth)
- Drizzle ORM
- **Claude Haiku 4.5 vision** for receipt OCR (~$0.003/receipt)
- Web Share API for native share sheets
- PWA shell — installable on iOS Safari and Android Chrome
- Vercel hosting on the free tier
- Vitest for unit tests (15 passing)

## Live

**Production:** https://cover-nine-psi.vercel.app

**Install on iPhone:** open the URL in Safari → Share → Add to Home Screen. Opens fullscreen like a native app, auto-updates on every git push.

## Design + plan

Specs live at [`docs/specs/`](./docs/specs/). Phased implementation plans live at [`docs/plans/`](./docs/plans/). Class artifact at [`docs/build-log.md`](./docs/build-log.md).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase + Anthropic keys
pnpm db:migrate
pnpm dev
```
