# Cover

**Split the bill in 30 seconds.**

Snap a photo of the receipt, tap who had what, and Cover sends each friend a personalized Venmo link with the exact amount they owe — all from your phone. No more one person fronting the bill and chasing everyone for their share.

**Live:** https://cover-nine-psi.vercel.app · **Repo:** https://github.com/bowserlee/cover · **Class artifact:** [`docs/build-log.md`](./docs/build-log.md)

## Where to find evidence for each rubric category

| Rubric category | Where to find evidence in this repo |
|---|---|
| **Problem & Insight** (3) | [Why I'm building this](#why-im-building-this) section below · parent spec [`docs/specs/2026-05-17-design.md`](./docs/specs/2026-05-17-design.md) |
| **Execution & Technical Work** (5) | Live app at [cover-nine-psi.vercel.app](https://cover-nine-psi.vercel.app) · [Stack](#stack), [Routes](#routes), [Usage](#usage) sections · 5 phased implementation plans in [`docs/plans/`](./docs/plans/) · 100+ commits in git history showing the iteration |
| **Evaluation & Evidence** (3) | [Evaluation & evidence](#evaluation--evidence) section below · 15 passing unit tests · the OCR pivot is a documented failure analysis with measurable before/after · [Known limitations](#known-limitations) section |
| **Communication & Presentation** (2) | This README · demo video (submitted separately) · [`docs/specs/`](./docs/specs/) · [`docs/plans/`](./docs/plans/) · [`docs/build-log.md`](./docs/build-log.md) · `pnpm install && pnpm dev` reproducibility |
| **Process, Integrity & Disclosure** (2) | [AI usage disclosure](#ai-usage-disclosure) section · [Acknowledgements & citations](#acknowledgements--citations) section · git commit history · [`docs/build-log.md`](./docs/build-log.md) week-by-week with hours and reflections · every phase has a spec → plan → commit trail |

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

## Usage

How to use the deployed app:

1. Visit **https://cover-nine-psi.vercel.app** on your phone (Safari on iPhone, Chrome on Android) or laptop
2. Sign in with your **Google account**
3. *(Optional but recommended on iPhone)* Tap **Share → Add to Home Screen** to install Cover so it opens fullscreen like a native app
4. Tap **Profile** in the dashboard header and add your **Venmo handle** — this is the handle your friends will pay you at
5. Tap **New bill** → take a photo or upload a receipt → wait ~3 sec for AI parsing → edit any items the model got wrong → **Save bill**
6. From the dashboard, tap the saved bill to open the assignment screen
7. Add the people at the meal — type **+ Add new**, or one-tap from your saved **Friends** roster (manage at `/friends`)
8. Optional: tap **+ Me** to include yourself so your share is counted in the totals
9. Tap a person at the top to make them "active," then tap items to assign them. Totals reconcile live with proportional tax + tip
10. When done, tap **Continue to send** → tap **Send** on each person's card → your phone's native share sheet pops up → text them their Venmo link (skip yourself; you don't owe yourself anything)
11. Mark each person **Paid** as they pay you back → the bill auto-archives to `/settled` when everyone's done

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

## Evaluation & evidence

How this project validates its claims and demonstrates iteration:

### Unit tests (15 passing)

| File | What it tests |
|---|---|
| [`src/lib/split-math/totals.test.ts`](./src/lib/split-math/totals.test.ts) | Per-person totals math, proportional tax + tip allocation, edge cases (zero subtotal, no assignments, rounding) — 7 cases |
| [`src/lib/venmo/url.test.ts`](./src/lib/venmo/url.test.ts) | Venmo deep-link URL encoding (special characters, leading `@`, amount formatting) — 5 cases |
| [`src/lib/venmo/message.test.ts`](./src/lib/venmo/message.test.ts) | Share-message generation with and without a Venmo handle — 3 cases |

Run with `pnpm test`. All 15 pass on `main`.

### Failure analysis — the OCR pivot (Week 3)

The central piece of "attempts to validate claims and understand limitations." The original spec ([`docs/specs/2026-05-17-design.md`](./docs/specs/2026-05-17-design.md)) had this in its Risks section:

> **"Tesseract.js OCR quality"** — if much worse than expected, the magic-moment demo falls flat. Mitigation: "tap to fix" UI from day 1; never block the user on perfect OCR. **Authorize a one-time $20 budget if it becomes a blocker, but treat that as a fallback only.**

The pre-authorized trigger fired:

| Engine | Accuracy on a real-world receipt | Cost per receipt | Code surface |
|---|---|---|---|
| Tesseract.js (initial) | ~10% — "basically none of the items correct" | $0 | ~100 lines of parser heuristics + ~10MB WASM bundle |
| Claude Haiku 4.5 vision (after pivot) | ~95% — "1 thing wrong" | ~$0.003 | ~30 lines of API call, no parser logic, no bundle bloat |

Full narrative in [`docs/build-log.md`](./docs/build-log.md) under Week 3.

### Other measurable outcomes

- **Bundle size:** ~10MB reduction after deleting Tesseract.js entirely from the client bundle
- **Projected total API cost** for the full 10-week class: **under $5**
- **Build/typecheck/test:** all green on `main` (production deploys auto-block on failure via Vercel)
- **Production uptime:** the app has been live and functional since Week 1 deploy
- **Schedule:** all 5 planned phases shipped by end of Week 3 calendar time — well ahead of the original 10-week scope

### Iteration evidence

- **5 design specs + 5 implementation plans** in `docs/specs/` and `docs/plans/`, each with commit trails
- **100+ commits** visible in git history showing real progress over time
- **Mid-project UX rewrite:** I shipped the assignment screen with a modal-based pattern, used it, decided it was too slow, and rewrote it to a select-person-then-tap-items flow. The original code was deleted in a single commit. This is documented in [`docs/build-log.md`](./docs/build-log.md) Week 3 and visible in the commit history.
- **Plan 5 (friends roster) was not in the original spec** — it emerged from actually thinking about how the product would be used at a real meal, which is the kind of insight you only get by testing your own assumptions

### Limitations (honest list of what doesn't work)

See the [Known limitations](#known-limitations) section directly below for an explicit accounting.

## Known limitations

Honest about what doesn't (yet) work:

- **OCR can mis-parse faded thermal-paper receipts**, low-light photos, or receipts with heavy decorative borders. Claude Haiku 4.5 vision is ~95% on typical restaurant receipts; the edit UI assumes some manual correction will happen.
- **Venmo deep-links don't auto-execute payments.** They open the Venmo app with recipient + amount + memo pre-filled, but the recipient still taps "Send." This is industry standard — including Splitwise. No public Venmo API exists to bypass this.
- **No automated Zelle support.** Phone numbers are stored on participant + friend records for the host's reference, but Zelle has no public URL scheme so it can't be deep-linked the way Venmo can.
- **No offline mode.** Cover installs as a PWA but reads/writes still hit Supabase. Going offline mid-flow breaks save.
- **Single-host model.** Only the bill creator has an account; participants receive links via share sheet but don't sign up. If a participant wants their own running tab view across multiple hosts, that's not supported yet.
- **No image storage.** Receipt photos are parsed in memory, used to populate the edit screen, and discarded. The text content survives in the DB; the photo itself doesn't.

## AI usage disclosure

Per CS 153 AI policy: *"The use of AI tools is allowed and in fact encouraged. You must mention how and where tools were used in your Github README file."*

### Build-time AI: Claude Code

**Tool:** [Claude Code](https://claude.com/claude-code) running Claude Opus 4.7.

**How it was used:**

- Wrote roughly **~90% of the code** in this repo from natural-language descriptions
- Drafted the original design spec and all five implementation plans in `docs/specs/` and `docs/plans/`
- Wrote all unit tests in `src/**/*.test.ts`
- Debugged production issues (e.g., the inherited dark-mode CSS bug that made input text invisible, the silent error swallow in the OCR pipeline)
- Pushed back on my plans when I tried to skip steps (e.g., reminding me to pressure-test the OCR pivot against the spec's pre-authorized budget clause)

**Where in the codebase Claude Code touched:** essentially everywhere. Specifically:

- **All TypeScript source** under `src/` — components, API routes, server pages, library code
- **Database schema** in `src/lib/db/schema.ts` and migrations in `drizzle/`
- **Documentation** in `docs/specs/`, `docs/plans/`, and `docs/build-log.md`
- **Icon generator** in `scripts/generate-icons.mjs`
- **This README**

**What I did vs Claude:** I owned product direction (what to build, when to pivot OCR engines, the assignment-UX rewrite when the modal version felt slow), tested every change in the browser, caught bugs Claude introduced (e.g., the icon's arc angles were wrong on first render — pointed at the wrong direction), and made the architectural decisions. Claude implemented those decisions and iterated on feedback.

### Runtime AI: Claude Haiku 4.5 vision

**Tool:** [Claude Haiku 4.5](https://www.anthropic.com/news/claude-haiku-4-5) via the Anthropic Messages API.

**How:** The app sends a receipt photo to Claude with a structured-JSON-output prompt. The model returns clean typed data: items (name, quantity, unit price), subtotal, tax, tip. Cost: ~$0.003 per receipt.

**Where in the codebase:**

- [`src/app/api/ocr/route.ts`](./src/app/api/ocr/route.ts) — server endpoint that calls Claude vision
- [`src/lib/ocr/recognize.ts`](./src/lib/ocr/recognize.ts) — client-side wrapper that posts the photo to the endpoint
- [`src/lib/ocr/types.ts`](./src/lib/ocr/types.ts) — shared types for the parsed receipt structure

**Why it's here instead of free OCR:** I originally used Tesseract.js (open-source, in-browser OCR) for zero ongoing cost. On a real-world test receipt it got "basically nothing right." The original spec pre-authorized swapping to a paid AI vision API with a $20 budget cap if this happened — that trigger fired in Week 3 and the swap to Claude vision took accuracy from ~10% to ~95%. The full story is in [`docs/build-log.md`](./docs/build-log.md) under Week 3.

### What was NOT AI-generated

- Product direction, feature scope, and all priority decisions
- All UX testing and "this feels wrong, change it" feedback that drove iteration
- The Supabase project, Google Cloud OAuth credentials, Vercel deployment configuration, and Anthropic API key (set up manually through the respective web consoles)
- The thesis framing and class artifact narrative

### Other dev tools

- **Vercel** for hosting + auto-deploy on git push
- **Supabase** for Postgres + Google OAuth
- **Drizzle Kit** for schema migrations
- **Supabase web SQL Editor** — used as a fallback for two migrations my local network couldn't apply via `pnpm db:migrate` (port 6543 was blocked)

### Code provenance

No code in this repo was forked from another public repo or copy-pasted from a tutorial. The Supabase auth + Drizzle ORM setup patterns were ported from my prior personal project [Conductor](https://github.com/bowserlee/conductor) (same author) but rewritten fresh for Cover.

## Design + plan

Specs live at [`docs/specs/`](./docs/specs/). Phased implementation plans live at [`docs/plans/`](./docs/plans/). Class artifact at [`docs/build-log.md`](./docs/build-log.md).

## Setup (local development)

**Prerequisites:**

- [Node.js](https://nodejs.org) 20 or higher
- [pnpm](https://pnpm.io) (the project uses pnpm; npm/yarn will work but pnpm-lock.yaml is the source of truth)
- A free [Supabase](https://supabase.com) account for the database + Google OAuth
- A [Google Cloud](https://console.cloud.google.com) project with OAuth 2.0 credentials configured (used for sign-in via Supabase)
- An [Anthropic](https://console.anthropic.com) API key for receipt OCR (add ~$5 of credit; that should cover months of usage)

**1. Clone the repo:**

```bash
git clone https://github.com/bowserlee/cover.git
cd cover
pnpm install
```

**2. Create `.env.local`** with the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-us-west-2.pooler.supabase.com:6543/postgres
ANTHROPIC_API_KEY=sk-ant-api03-...
```

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase dashboard → **Settings → API**
- `DATABASE_URL`: Supabase dashboard → **Settings → Database → Connection string → Transaction pooler** (port 6543)
- `ANTHROPIC_API_KEY`: [console.anthropic.com](https://console.anthropic.com) → **API Keys → Create Key**

**3. Configure Google OAuth in Supabase:**

- Google Cloud Console → create an OAuth 2.0 Client ID → add `https://<your-project>.supabase.co/auth/v1/callback` as an authorized redirect URI
- Supabase → **Authentication → Providers → Google** → enable, paste the Client ID + Secret
- Supabase → **Authentication → URL Configuration** → add `http://localhost:3000/auth/callback` to the redirect URL allowlist

**4. Apply database migrations:**

```bash
pnpm db:migrate
```

(If `pnpm db:migrate` hangs because your network blocks port 6543, paste the SQL in `drizzle/*.sql` into Supabase's web SQL Editor instead.)

**5. Run the dev server:**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Other commands:**

```bash
pnpm test        # vitest unit tests
pnpm build       # production build
pnpm db:generate # generate a new migration after editing src/lib/db/schema.ts
node scripts/generate-icons.mjs  # regenerate PWA icons
```

## Acknowledgements & citations

Cover stands on a lot of free and open-source foundations. None of this would have been doable in 10 weeks solo without:

**Framework + language:**

- [Next.js 16](https://nextjs.org) (Vercel) — React framework powering both the frontend and the API
- [React 19](https://react.dev) (Meta) — UI library
- [TypeScript](https://www.typescriptlang.org) (Microsoft) — type safety
- [Tailwind CSS 4](https://tailwindcss.com) — utility-first styling

**Backend services:**

- [Supabase](https://supabase.com) — Postgres database, Google OAuth, generous free tier
- [Drizzle ORM](https://orm.drizzle.team) — type-safe SQL queries + migrations
- [Vercel](https://vercel.com) — hosting on the free Hobby tier with GitHub auto-deploys

**AI runtime:**

- [Anthropic Claude Haiku 4.5 vision](https://www.anthropic.com) — receipt OCR engine (~$0.003 per receipt)
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) — official TypeScript client

**Dev / build tools:**

- [pnpm](https://pnpm.io) — package manager
- [Vitest](https://vitest.dev) — unit test framework
- [Sharp](https://sharp.pixelplumbing.com) — image processing (used in `scripts/generate-icons.mjs` to render PWA icons)
- [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API) — browser-native share sheet for sending Venmo links

**Inspiration:**

- [Splitwise](https://www.splitwise.com) — the product Cover deliberately mirrors. The thesis: what required a Splitwise-sized team in 2011 takes one person + AI in 2026.
- [Plates](https://www.platesapp.com), [Tricount](https://www.tricount.com) — other bill-split apps surveyed during the design phase.
- Every group dinner at Phi Psi where someone got stuck holding the bill.

**Class context:**

- CS 153 — *The One-Person Frontier Lab* (Stanford, Spring 2026)

**Code provenance:**

No code in this repo was forked from another public repo or copy-pasted from a tutorial. The Supabase + Drizzle scaffolding patterns were ported from my prior personal project [Conductor](https://github.com/bowserlee/conductor) (same author) but rewritten fresh for Cover.

## External resources

- **Live production app:** https://cover-nine-psi.vercel.app
- **Source code:** https://github.com/bowserlee/cover
- **Build log + class artifact:** [`docs/build-log.md`](./docs/build-log.md)
- **Architecture spec:** [`docs/specs/2026-05-17-design.md`](./docs/specs/2026-05-17-design.md)
- **Implementation plans:** [`docs/plans/`](./docs/plans/)
