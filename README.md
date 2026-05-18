# Cover

**Split the bill in 30 seconds.**

Snap a photo of the receipt, tap who had what, and Cover sends each friend a personalized Venmo link with the exact amount they owe — all from your phone. No more one person fronting the bill and chasing everyone for their share.

## Why I'm building this

Every time my friends and I go out to eat, someone ends up covering the bill and then has to follow up with everyone to get paid back. Most restaurants only split checks 2–3 ways, and following up feels awkward. Cover fixes that.

This is also a class project, built around a specific thesis:

> *Splitwise was built by a small team in 2011 and took years to reach product-market fit. In 2026, one freshman with modern AI coding tools (Cursor, Claude Code) is rebuilding the core product solo in 10 weeks, with $0 in ongoing API costs.*

The product is intentionally not new. The point is to demonstrate the asymmetry between what a team had to do in 2011 and what one person can do in 2026.

## Status

**Week 1 of 10.** Project scaffold initialized, design spec and implementation plan committed. Currently wiring up auth, database, and the PWA install shell.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind 4
- Supabase (Postgres + Google OAuth)
- Drizzle ORM
- Tesseract.js for in-browser receipt OCR
- Web Share + Web Push APIs (no SMS service needed)
- Vercel hosting on the free tier
- **Zero paid APIs, zero ongoing costs**

## Design + plan

The full design lives at [`docs/specs/2026-05-17-design.md`](./docs/specs/2026-05-17-design.md). The phased implementation plan starts at [`docs/plans/2026-05-17-plan-1-foundation.md`](./docs/plans/2026-05-17-plan-1-foundation.md).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase keys (added in Plan 1, Task 2)
pnpm dev
```
