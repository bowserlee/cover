# Cover Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a Next.js PWA with Google sign-in, Supabase Postgres + Drizzle ORM, and an authenticated placeholder dashboard — the walking skeleton for Cover.

**Architecture:** Next.js 16 App Router + Tailwind 4 on Vercel free tier. Supabase Postgres + Auth (Google OAuth) on free tier. Drizzle ORM for typed queries and migrations. PWA shell (manifest + minimal service worker) so the app installs on iOS Safari and Android Chrome. Auth-related scaffolding ported from the user's existing Conductor project at `/Users/bauerlee/conductor`. Class artifact tracking (README, build-log.md) initialized from day 1.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Auth), Drizzle ORM, pnpm, Vercel.

---

## File Structure

**Files to create:**

| Path | Responsibility |
|---|---|
| `package.json` | pnpm dependencies + scripts |
| `next.config.ts` | Next.js config |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.ts` | Tailwind config |
| `.env.example` | Template for required env vars (committed) |
| `.env.local` | Real env vars (gitignored) |
| `drizzle.config.ts` | Drizzle migration config |
| `src/app/layout.tsx` | Root layout, registers PWA viewport |
| `src/app/page.tsx` | Landing page — redirects authed → /dashboard, unauthed → /login |
| `src/app/(auth)/login/page.tsx` | Login page with Google sign-in button |
| `src/app/auth/callback/route.ts` | OAuth callback handler |
| `src/app/dashboard/page.tsx` | Authenticated landing — placeholder for now |
| `src/app/api/auth/signout/route.ts` | POST endpoint to sign out |
| `src/lib/supabase/client.ts` | Browser-side Supabase client |
| `src/lib/supabase/server.ts` | Server-side Supabase client (RSC + route handlers) |
| `src/lib/db/client.ts` | Drizzle DB client (`getDb()`) |
| `src/lib/db/schema.ts` | Drizzle schema — all 6 tables |
| `src/components/SignOutButton.tsx` | Client component for logout |
| `src/components/InstallPrompt.tsx` | iOS/Android PWA install prompt |
| `src/components/ServiceWorkerRegistration.tsx` | Client component that registers the SW on mount |
| `src/middleware.ts` | Auth guard middleware (protects /dashboard, /splits, /split, /new) |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Minimal service worker |
| `public/icons/icon-192.png` | PWA icon (192x192) — placeholder |
| `public/icons/icon-512.png` | PWA icon (512x512) — placeholder |
| `README.md` | Public-facing thesis + tracking |
| `docs/build-log.md` | Week-by-week build artifact |
| `.gitignore` | Ignore .env.local, node_modules, .next, etc. |

**Files modified:** none (greenfield project).

---

## Task 1: Initialize Next.js project + git repo

**Files:**
- Create: `/Users/bauerlee/cover/package.json` (and Next.js scaffold)
- Create: `/Users/bauerlee/cover/.gitignore`
- Create: `/Users/bauerlee/cover/src/app/page.tsx`
- Create: `/Users/bauerlee/cover/src/app/layout.tsx`
- Create: `/Users/bauerlee/cover/next.config.ts`
- Create: `/Users/bauerlee/cover/tsconfig.json`
- Create: `/Users/bauerlee/cover/tailwind.config.ts`

- [ ] **Step 1: Verify working directory and spec exists**

```bash
cd /Users/bauerlee/cover && ls docs/specs/
```

Expected output:
```
2026-05-17-design.md
```

- [ ] **Step 2: Initialize git repo with `main` as default branch**

```bash
cd /Users/bauerlee/cover && git init -b main
```

Expected: `Initialized empty Git repository in /Users/bauerlee/cover/.git/`

- [ ] **Step 3: Run create-next-app in current directory (non-interactive)**

```bash
cd /Users/bauerlee/cover && pnpm create next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias '@/*' \
  --use-pnpm \
  --turbopack
```

Expected: Project files scaffolded. `docs/` directory is preserved (create-next-app does not touch it).

Notes:
- If prompted "Ok to proceed?" answer `y`.
- If create-next-app refuses because the directory isn't empty, retry with `--skip-install` and then run `pnpm install` separately.

- [ ] **Step 4: Verify dev server boots**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

Expected: server starts on `http://localhost:3000`, shows the default Next.js page.

Stop with Ctrl+C.

- [ ] **Step 5: First commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

Expected: commit succeeds with all scaffolded files.

---

## Task 2: Create Supabase project + configure env vars

**Files:**
- Create: `/Users/bauerlee/cover/.env.local` (gitignored)
- Create: `/Users/bauerlee/cover/.env.example` (committed)

- [ ] **Step 1: Create Supabase project (manual, via web UI)**

Browser actions:
1. Go to `https://supabase.com/dashboard`
2. Click "New project"
3. Organization: select existing or create
4. Project name: `cover`
5. Database password: click "Generate a password" — **save this to a password manager**
6. Region: `West US (North California)` (closest to Stanford)
7. Pricing plan: Free
8. Click "Create new project"
9. Wait ~2 minutes for provisioning

- [ ] **Step 2: Copy Supabase URL and anon key**

In Supabase dashboard:
1. Settings → API
2. Copy "Project URL" (looks like `https://xxxxx.supabase.co`)
3. Copy "anon public" key (the long `eyJ...` string)

- [ ] **Step 3: Copy database connection string**

In Supabase dashboard:
1. Settings → Database
2. Connection string → URI
3. Copy the connection string, replace `[YOUR-PASSWORD]` with the password saved in Step 1

It looks like:
```
postgresql://postgres.xxxxx:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

- [ ] **Step 4: Create `.env.local`**

Create `/Users/bauerlee/cover/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

- [ ] **Step 5: Create `.env.example` (committed)**

Create `/Users/bauerlee/cover/.env.example`:

```
# Supabase — get from Settings → API in Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase Postgres — get from Settings → Database in Supabase dashboard
DATABASE_URL=
```

- [ ] **Step 6: Verify `.env.local` is gitignored**

```bash
cd /Users/bauerlee/cover && grep -E '^\.env' .gitignore
```

Expected: shows `.env*` or similar pattern. Next.js's default .gitignore already includes this.

- [ ] **Step 7: Commit `.env.example`**

```bash
cd /Users/bauerlee/cover && git add .env.example && git commit -m "chore: add .env.example with required env vars"
```

---

## Task 3: Port Supabase client setup from Conductor

**Files:**
- Create: `/Users/bauerlee/cover/src/lib/supabase/client.ts`
- Create: `/Users/bauerlee/cover/src/lib/supabase/server.ts`

**Reference Conductor patterns at:**
- `/Users/bauerlee/conductor/apps/web/src/lib/supabase/server.ts` — exports `createServerClient()`

- [ ] **Step 1: Install Supabase packages**

```bash
cd /Users/bauerlee/cover && pnpm add @supabase/supabase-js @supabase/ssr
```

Expected: packages added to `package.json`.

- [ ] **Step 2: Read Conductor's server.ts for reference**

```bash
cat /Users/bauerlee/conductor/apps/web/src/lib/supabase/server.ts
```

Note the pattern: it uses `createServerClient` from `@supabase/ssr` with cookies from `next/headers`.

- [ ] **Step 3: Create browser-side client**

Create `/Users/bauerlee/cover/src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Create server-side client**

Create `/Users/bauerlee/cover/src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware handles refresh
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: Verify type-checking passes**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/bauerlee/cover && git add src/lib/supabase/ package.json pnpm-lock.yaml && git commit -m "feat: add Supabase client setup ported from Conductor"
```

---

## Task 4: Install Drizzle, define schema, run first migration

**Files:**
- Create: `/Users/bauerlee/cover/drizzle.config.ts`
- Create: `/Users/bauerlee/cover/src/lib/db/client.ts`
- Create: `/Users/bauerlee/cover/src/lib/db/schema.ts`
- Create: `/Users/bauerlee/cover/drizzle/` (migrations directory)

**Reference Conductor patterns at:**
- `/Users/bauerlee/conductor/apps/web/src/lib/db/schema.ts`
- `/Users/bauerlee/conductor/apps/web/src/lib/db/client.ts`

**Critical import convention (from Conductor):** Always use named imports from `@/lib/db/schema`. NEVER `import { schema } from "@/lib/db/schema"`.

- [ ] **Step 1: Install Drizzle packages**

```bash
cd /Users/bauerlee/cover && pnpm add drizzle-orm postgres && pnpm add -D drizzle-kit @types/pg dotenv
```

Expected: packages added.

- [ ] **Step 2: Create `drizzle.config.ts`**

Create `/Users/bauerlee/cover/drizzle.config.ts`:

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Create DB client at `src/lib/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false });
  _db = drizzle(client);
  return _db;
}
```

- [ ] **Step 4: Create schema at `src/lib/db/schema.ts`**

```ts
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const splitStatus = pgEnum("split_status", ["open", "closed"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  venmoHandle: text("venmo_handle"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const splits = pgTable("splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull(),
  name: text("name").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  tip: numeric("tip", { precision: 12, scale: 2 }).notNull().default("0"),
  status: splitStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const splitItems = pgTable("split_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id")
    .notNull()
    .references(() => splits.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  rawOcrLine: text("raw_ocr_line"),
});

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id")
    .notNull()
    .references(() => splits.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  venmoHandle: text("venmo_handle"),
  totalOwed: numeric("total_owed", { precision: 12, scale: 2 }).notNull().default("0"),
  paid: boolean("paid").notNull().default(false),
});

export const itemAssignments = pgTable("item_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => splitItems.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  shareFraction: numeric("share_fraction", { precision: 6, scale: 4 })
    .notNull()
    .default("1"),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id")
    .notNull()
    .references(() => splits.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  ocrRaw: text("ocr_raw"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

- [ ] **Step 5: Generate the first migration**

```bash
cd /Users/bauerlee/cover && pnpm drizzle-kit generate --name init
```

Expected: creates `drizzle/0000_init.sql` (or similar numbered name).

- [ ] **Step 6: Apply migration to Supabase**

```bash
cd /Users/bauerlee/cover && pnpm drizzle-kit migrate
```

Expected: migration applied. Tables visible in Supabase dashboard → Table Editor.

- [ ] **Step 7: Verify tables exist in Supabase**

Browser actions:
1. Supabase dashboard → Table Editor
2. Confirm tables visible: `profiles`, `splits`, `split_items`, `participants`, `item_assignments`, `receipts`

- [ ] **Step 8: Add db scripts to `package.json`**

In `package.json`, add to `scripts`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 9: Commit**

```bash
cd /Users/bauerlee/cover && git add . && git commit -m "feat: add Drizzle schema with profiles, splits, items, participants, assignments, receipts"
```

---

## Task 5: Configure Google OAuth and build login page

**Files:**
- Create: `/Users/bauerlee/cover/src/app/(auth)/login/page.tsx`
- Create: `/Users/bauerlee/cover/src/app/auth/callback/route.ts`

- [ ] **Step 1: Create Google OAuth credentials in Google Cloud Console**

Browser actions:
1. Go to `https://console.cloud.google.com`
2. Create a new project named `cover-auth` (or use existing)
3. Navigation menu → APIs & Services → OAuth consent screen
4. User type: External → Create
5. Fill: App name `Cover`, support email (your email)
6. Add scopes: `openid`, `email`, `profile`
7. Add yourself as test user
8. Save and continue

Then:
9. APIs & Services → Credentials → Create credentials → OAuth client ID
10. Application type: Web application
11. Name: `Cover web`
12. Authorized redirect URIs: add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (find the URL in Supabase Authentication → Providers → Google)
13. Create
14. Copy Client ID and Client Secret

- [ ] **Step 2: Enable Google provider in Supabase**

Browser actions:
1. Supabase dashboard → Authentication → Providers
2. Find Google → enable
3. Paste Client ID and Client Secret from Step 1
4. Save

- [ ] **Step 3: Configure Supabase redirect URLs**

In Supabase dashboard:
1. Authentication → URL Configuration
2. Site URL: `http://localhost:3000` (for now — will update for production)
3. Redirect URLs: add `http://localhost:3000/auth/callback`
4. Save

- [ ] **Step 4: Create login page**

Create `/Users/bauerlee/cover/src/app/(auth)/login/page.tsx`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-semibold mb-2">Cover</h1>
        <p className="text-neutral-500 mb-12">Split the bill in 30 seconds.</p>
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 transition"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create OAuth callback handler**

Create `/Users/bauerlee/cover/src/app/auth/callback/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

- [ ] **Step 6: Verify type-check passes**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Test login flow manually**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

Then in browser:
1. Visit `http://localhost:3000/login`
2. Click "Continue with Google"
3. Sign in with a Google account
4. Should redirect to `http://localhost:3000/dashboard` — will 404 for now (next task adds it)

Stop dev server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add Google OAuth login flow with Supabase Auth"
```

---

## Task 6: Authenticated dashboard + middleware + signout

**Files:**
- Create: `/Users/bauerlee/cover/src/app/dashboard/page.tsx`
- Create: `/Users/bauerlee/cover/src/middleware.ts`
- Create: `/Users/bauerlee/cover/src/app/api/auth/signout/route.ts`
- Create: `/Users/bauerlee/cover/src/components/SignOutButton.tsx`
- Modify: `/Users/bauerlee/cover/src/app/page.tsx` (root landing)

- [ ] **Step 1: Create middleware to gate authenticated routes**

Create `/Users/bauerlee/cover/src/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/splits", "/split", "/new"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
```

- [ ] **Step 2: Create signout API route**

Create `/Users/bauerlee/cover/src/app/api/auth/signout/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
```

- [ ] **Step 3: Create SignOutButton client component**

Create `/Users/bauerlee/cover/src/components/SignOutButton.tsx`:

```tsx
"use client";

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className="text-sm text-neutral-500 hover:text-black transition"
      >
        Sign out
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create dashboard page**

Create `/Users/bauerlee/cover/src/app/dashboard/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Cover</h1>
        <SignOutButton />
      </header>
      <main className="px-6 py-12 max-w-md mx-auto text-center">
        <p className="text-neutral-500 mb-2">Signed in as</p>
        <p className="font-medium mb-12">{user.email}</p>
        <button
          disabled
          className="w-full bg-black text-white rounded-full py-3 font-medium opacity-50 cursor-not-allowed"
        >
          New bill (coming soon)
        </button>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Update root landing page to redirect**

Replace `/Users/bauerlee/cover/src/app/page.tsx` with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
```

- [ ] **Step 6: Verify type-check passes**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Test full auth flow manually**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

Browser test:
1. Visit `http://localhost:3000/` → should redirect to `/login`
2. Click "Continue with Google" → sign in
3. Should land on `/dashboard` showing your email
4. Click "Sign out" → redirect to `/login`
5. Try visiting `/dashboard` directly without signing in → should redirect to `/login`

Stop dev server.

- [ ] **Step 8: Commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add auth-gated dashboard, middleware, and signout flow"
```

---

## Task 7: PWA manifest, service worker, install prompt

**Files:**
- Create: `/Users/bauerlee/cover/public/manifest.json`
- Create: `/Users/bauerlee/cover/public/sw.js`
- Create: `/Users/bauerlee/cover/public/icons/icon-192.png` (placeholder)
- Create: `/Users/bauerlee/cover/public/icons/icon-512.png` (placeholder)
- Create: `/Users/bauerlee/cover/src/components/InstallPrompt.tsx`
- Create: `/Users/bauerlee/cover/src/components/ServiceWorkerRegistration.tsx`
- Modify: `/Users/bauerlee/cover/src/app/layout.tsx`
- Modify: `/Users/bauerlee/cover/src/app/dashboard/page.tsx`

- [ ] **Step 1: Generate placeholder PWA icons**

Create the icons directory and download two solid-black placeholder PNGs:

```bash
mkdir -p /Users/bauerlee/cover/public/icons && \
cd /Users/bauerlee/cover/public/icons && \
curl -L "https://dummyimage.com/192x192/000000/000000.png" -o icon-192.png && \
curl -L "https://dummyimage.com/512x512/000000/000000.png" -o icon-512.png
```

If `dummyimage.com` is unreachable, manually create two black PNGs of those sizes in Preview (File → New from Clipboard after copying a black square) and save them to the path above. These are placeholders — replace with real icons in Plan 5.

Verify:

```bash
ls /Users/bauerlee/cover/public/icons/
```

Expected: `icon-192.png  icon-512.png`

- [ ] **Step 2: Create `public/manifest.json`**

```json
{
  "name": "Cover",
  "short_name": "Cover",
  "description": "Split the bill in 30 seconds.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 3: Create minimal service worker at `public/sw.js`**

```js
// Cover service worker — minimal v1
// Required for PWA install prompt on iOS Safari and Chrome.
// Caches nothing; real offline strategy is post-v1.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through — no caching yet.
});
```

- [ ] **Step 4: Create ServiceWorkerRegistration client component**

Create `/Users/bauerlee/cover/src/components/ServiceWorkerRegistration.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent failure — SW is best-effort, not critical to app function.
    });
  }, []);

  return null;
}
```

- [ ] **Step 5: Update root layout to use ServiceWorkerRegistration + PWA metadata**

Replace `/Users/bauerlee/cover/src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Cover",
  description: "Split the bill in 30 seconds.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cover",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create install prompt component**

Create `/Users/bauerlee/cover/src/components/InstallPrompt.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setDismissed(localStorage.getItem("cover-install-dismissed") === "1");
  }, []);

  if (!isIos || isStandalone || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem("cover-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 bg-black text-white rounded-2xl p-4 shadow-lg text-sm flex items-start gap-3 max-w-md mx-auto">
      <div className="flex-1">
        <p className="font-medium mb-1">Install Cover</p>
        <p className="text-neutral-300">
          Tap <span className="font-medium">Share</span> →{" "}
          <span className="font-medium">Add to Home Screen</span>.
        </p>
      </div>
      <button onClick={dismiss} className="text-neutral-400 hover:text-white">
        Dismiss
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Add install prompt to dashboard**

Replace `/Users/bauerlee/cover/src/app/dashboard/page.tsx` with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { InstallPrompt } from "@/components/InstallPrompt";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Cover</h1>
        <SignOutButton />
      </header>
      <main className="px-6 py-12 max-w-md mx-auto text-center">
        <p className="text-neutral-500 mb-2">Signed in as</p>
        <p className="font-medium mb-12">{user.email}</p>
        <button
          disabled
          className="w-full bg-black text-white rounded-full py-3 font-medium opacity-50 cursor-not-allowed"
        >
          New bill (coming soon)
        </button>
      </main>
      <InstallPrompt />
    </div>
  );
}
```

- [ ] **Step 8: Verify PWA setup in browser**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

In browser (Chrome desktop):
1. Visit `http://localhost:3000` → login → land on `/dashboard`
2. DevTools → Application → Manifest — should show Cover, both icons load, no errors
3. DevTools → Application → Service Workers — should show `/sw.js` registered and activated

Stop dev server.

- [ ] **Step 9: Commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add PWA manifest, service worker, and iOS install prompt"
```

---

## Task 8: Deploy to Vercel

**Files:** none (deployment is via Vercel CLI or web UI)

- [ ] **Step 1: Push to GitHub**

Browser actions:
1. Go to `https://github.com/new`
2. Repository name: `cover`
3. Public
4. Do NOT initialize with README/license/.gitignore (already have them)
5. Create repository

Then locally:

```bash
cd /Users/bauerlee/cover && \
  git remote add origin https://github.com/YOUR-USERNAME/cover.git && \
  git push -u origin main
```

Expected: push succeeds.

- [ ] **Step 2: Create Vercel project**

Browser actions:
1. Go to `https://vercel.com/new`
2. Import the `cover` GitHub repo
3. Framework Preset: Next.js (auto-detected)
4. Root Directory: `./`
5. Click "Environment Variables" — add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (from .env.local)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from .env.local)
   - `DATABASE_URL` = (from .env.local)
6. Click "Deploy"

Wait ~2 minutes for first build.

- [ ] **Step 3: Get the deployment URL**

Vercel will assign a URL like `https://cover-XXXX.vercel.app`. Save it.

- [ ] **Step 4: Update Supabase URL configuration with the production URL**

In Supabase dashboard:
1. Authentication → URL Configuration
2. Site URL: replace `http://localhost:3000` with `https://cover-XXXX.vercel.app`
3. Redirect URLs: ADD (don't replace) `https://cover-XXXX.vercel.app/auth/callback`
   - Keep `http://localhost:3000/auth/callback` for local dev
4. Save

- [ ] **Step 5: Test production deployment**

Browser actions:
1. Visit the Vercel URL
2. Should redirect to /login
3. Sign in with Google
4. Should redirect to /dashboard showing your email
5. Sign out → back to /login

If sign-in fails, check Vercel project → Settings → Environment Variables to confirm they are set correctly. Redeploy if needed.

- [ ] **Step 6: Verify PWA on mobile (real device)**

On an iPhone:
1. Open Safari → visit the Vercel URL
2. Sign in
3. Should see the install prompt at the bottom of /dashboard
4. Tap Share → Add to Home Screen → Add
5. Open Cover from the home screen — should open in standalone mode (no Safari chrome)
6. Confirm sign-in persists

---

## Task 9: Public README and build-log artifact

**Files:**
- Create: `/Users/bauerlee/cover/README.md`
- Create: `/Users/bauerlee/cover/docs/build-log.md`

- [ ] **Step 1: Write public README**

Create `/Users/bauerlee/cover/README.md`:

```markdown
# Cover

Split the bill in 30 seconds.

Scan a receipt, assign items, send each person a personalized Venmo link via their phone's native share sheet.

## What this is

Cover is a class project built to demonstrate the thesis that **one person with modern AI coding tools can rebuild in 10 weeks what required a startup team and years**.

Splitwise was built in 2011 and took years to reach product-market fit. This is a single freshman rebuilding the core product in a quarter, with $0 in ongoing API costs.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (Postgres + Auth)
- Drizzle ORM
- Tesseract.js (in-browser OCR)
- Web Share + Web Push APIs (zero backend dependencies)
- Vercel (hosting, free tier)

## Live

[Production URL — fill in after deploy]

## Status

**Week 1 of 10.** Foundation deployed: auth, database, PWA shell.

## Class artifact

See `docs/build-log.md` for week-by-week progress, hours, and AI-tool usage tracking.

## Local development

```bash
pnpm install
cp .env.example .env.local  # fill in Supabase + DATABASE_URL
pnpm db:migrate
pnpm dev
```
```

- [ ] **Step 2: Write build-log template**

Create `/Users/bauerlee/cover/docs/build-log.md`:

```markdown
# Cover Build Log

Tracking hours, AI tool usage, and weekly progress for the class artifact.

## Stats

| Metric | Value |
|---|---|
| Total hours worked | [updated weekly] |
| % of code AI-generated (estimated) | [updated weekly] |
| API costs to date | $0 |
| Real bills processed | 0 (pre-launch) |
| Users | 0 (pre-launch) |

## Week 1 — Foundation

**Dates:** [start date] – [end date]

**Goal:** Deployed PWA with auth, database, and PWA shell.

**Tasks completed:**
- [ ] Project initialized (Next.js + TypeScript + Tailwind)
- [ ] Supabase project created and configured
- [ ] Supabase client setup ported from Conductor
- [ ] Drizzle schema defined and migrated (6 tables)
- [ ] Google OAuth login flow
- [ ] Auth-gated dashboard + signout
- [ ] PWA manifest + service worker + iOS install prompt
- [ ] Deployed to Vercel
- [ ] README + build log created

**Hours:** [fill in]

**AI tools used:** Claude Code, Cursor — [estimate % of code generated]

**What was hard:**
- [fill in]

**What surprised:**
- [fill in]

**Next week:** Plan 2 — New Bill Flow (Tesseract OCR + item editing)

---
```

- [ ] **Step 3: Verify both files look right in the repo**

```bash
cd /Users/bauerlee/cover && ls README.md docs/build-log.md
```

Expected: both files listed.

- [ ] **Step 4: Final commit + push**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "docs: add public README and build-log artifact for class tracking"
cd /Users/bauerlee/cover && git push
```

Expected: push succeeds, Vercel re-deploys (no functional changes).

---

## Done with Plan 1

By the end of this plan, you should have:
- A working PWA at `https://cover-XXXX.vercel.app`
- Google sign-in functional in production
- All 6 database tables created in Supabase
- PWA installable on iPhone and Android
- Public GitHub repo with thesis-ready README and build-log
- ~6–10 commits documenting the work

**Next:** `Plan 2 — New Bill Flow` (Tesseract OCR + item editing). Write that plan when this one is done.
