# Cover Build Log

Tracking hours, AI tool usage, and weekly progress for the class artifact.

## Stats

| Metric | Value |
|---|---|
| Total hours worked | _[fill in weekly]_ |
| % of code AI-generated (estimated) | _[fill in weekly]_ |
| API costs to date | $0 |
| Real bills processed | 0 (pre-launch) |
| Users | 0 (pre-launch) |

---

## Week 1 — Foundation

**Dates:** 2026-05-17 – 2026-05-27

**Goal:** Deploy a working PWA with auth, database, and PWA shell — the walking skeleton.

**Shipped:**
- [x] Project initialized (Next.js 16 + React 19 + TypeScript + Tailwind 4)
- [x] Supabase project created (West US / N. California, free tier)
- [x] Supabase client setup (browser + server, ported from prior Conductor project)
- [x] Drizzle schema with 6 tables (`profiles`, `splits`, `split_items`, `participants`, `item_assignments`, `receipts`) + first migration applied
- [x] Google OAuth login flow (Google Cloud Console + Supabase provider)
- [x] Auth-gated dashboard with email display + signout
- [x] Auth proxy (`proxy.ts` — Next.js 16's renamed middleware) protecting `/dashboard`, `/splits`, `/split`, `/new`
- [x] PWA manifest, minimal service worker, iOS install prompt
- [x] Deployed to Vercel (free tier) at https://cover-nine-psi.vercel.app
- [x] Installable on iPhone — opens fullscreen from home screen, no Safari chrome
- [x] Public GitHub repo at https://github.com/bowserlee/cover
- [x] README with thesis + build log

**Architecture decisions made:**
- **PWA over native:** $0 in app store fees, one codebase serves web + iPhone + Android, no App Store approval cycle. Load-bearing for the 10-week solo timeline.
- **Supabase pooler URL (port 6543), not direct (5432):** Vercel's serverless functions open a new Postgres connection per request — the direct URL would blow through Supabase's free-tier connection limit fast.
- **`proxy.ts` instead of `middleware.ts`:** Next.js 16 renamed the file convention. Took ~5 min of doc-reading to catch — training data lag from older Next versions would've sent me down a dead end here.
- **Same env vars across Vercel's production/preview/development envs:** solo project, one Supabase database. Splitting envs would be premature.

**Hours:** _[fill in]_

**AI tools used:**
- Claude Code (Opus 4.7) — primary
- _[add any others, % of code generated]_

**What was hard:**
- _[fill in — e.g. Google OAuth setup, finding the right Supabase connection string variant, etc.]_

**What surprised me:**
- _[fill in — e.g. how fast PWA install actually works on iPhone, etc.]_

**Next week:** Plan 2 — New Bill Flow (Tesseract OCR + receipt parsing + item editing UI). Riskiest part of the project; OCR accuracy on real-world receipts is the biggest unknown.

---
