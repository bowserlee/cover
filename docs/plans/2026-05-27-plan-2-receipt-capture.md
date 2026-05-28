# Cover Plan 2: Receipt Capture + Item Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new-bill flow at `/new`: capture a receipt photo, parse it with Tesseract.js in-browser, let the user edit the parsed items + tax + tip, save the bill to the DB, and surface it on the dashboard as a draft.

**Architecture:** Single-page state machine at `/new` (`capture → loading → edit → saving`). Tesseract.js is lazy-loaded only on `/new` so the 10MB worker doesn't bloat the main bundle. Parser is a pure function (vitest-tested) that turns Tesseract's raw text into a structured `ParsedReceipt`. A POST `/api/splits` endpoint persists the split + items in a Drizzle transaction. Dashboard gains a "Drafts" list reading from the DB.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Drizzle ORM, Tesseract.js v6, vitest (new in this plan), Supabase Postgres (already provisioned).

---

## File Structure

**Files to create:**

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest configuration |
| `src/lib/ocr/types.ts` | `ParsedReceipt`, `ParsedItem` shared types |
| `src/lib/ocr/parser.ts` | Pure function: raw text → `ParsedReceipt` |
| `src/lib/ocr/parser.test.ts` | Vitest unit tests for `parser.ts` |
| `src/lib/ocr/tesseract.ts` | Tesseract.js wrapper (lazy-imported only) |
| `src/components/ReceiptCapture.tsx` | File input + camera trigger button |
| `src/components/ItemEditor.tsx` | Inline-edit list of items + tax/tip + bill name |
| `src/components/DraftsList.tsx` | Server component, renders host's saved splits |
| `src/app/new/page.tsx` | Client page, state machine wiring it all together |
| `src/app/api/splits/route.ts` | POST endpoint — insert split + items |

**Files modified:**

| Path | Change |
|---|---|
| `package.json` | Add tesseract.js dep + vitest dev deps + test scripts |
| `src/app/dashboard/page.tsx` | Enable "New bill" button + mount `<DraftsList />` |

---

## Task 1: Install Tesseract.js + configure vitest

**Files:**
- Modify: `/Users/bauerlee/cover/package.json`
- Create: `/Users/bauerlee/cover/vitest.config.ts`

- [ ] **Step 1: Install runtime + test dependencies**

```bash
cd /Users/bauerlee/cover && pnpm add tesseract.js && pnpm add -D vitest @vitejs/plugin-react @vitest/ui jsdom
```

Expected: `tesseract.js` (~6.x) added to `dependencies`; `vitest`, `@vitejs/plugin-react`, `@vitest/ui`, `jsdom` added to `devDependencies`.

- [ ] **Step 2: Create vitest config**

Create `/Users/bauerlee/cover/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Open `/Users/bauerlee/cover/package.json`. In the `scripts` object, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

(Add commas as needed to keep valid JSON.)

- [ ] **Step 4: Verify vitest boots with no tests**

```bash
cd /Users/bauerlee/cover && pnpm test 2>&1 | tail -10
```

Expected: vitest runs, reports "No test files found, exiting with code 1" (which is fine — we add tests in Task 2).

- [ ] **Step 5: Commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "chore: install tesseract.js + vitest for receipt parsing"
```

---

## Task 2: OCR types

**Files:**
- Create: `/Users/bauerlee/cover/src/lib/ocr/types.ts`

- [ ] **Step 1: Create types file**

Create `/Users/bauerlee/cover/src/lib/ocr/types.ts`:

```ts
export interface ParsedItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ParsedReceipt {
  items: ParsedItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/lib/ocr/types.ts && git commit -m "feat: add ParsedReceipt + ParsedItem types"
```

---

## Task 3: Receipt text parser (TDD)

**Files:**
- Create: `/Users/bauerlee/cover/src/lib/ocr/parser.test.ts`
- Create: `/Users/bauerlee/cover/src/lib/ocr/parser.ts`

**Note:** This task uses strict TDD. Write the failing test first, see it fail, then write the implementation. Do not skip ahead.

- [ ] **Step 1: Write failing tests**

Create `/Users/bauerlee/cover/src/lib/ocr/parser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseReceiptText } from "./parser";

describe("parseReceiptText", () => {
  it("extracts items from a simple receipt", () => {
    const text = `
PHI PSI HOUSE
123 Mayfield Ave

Burger          12.50
Fries            5.00
Coke             3.00
`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Burger", quantity: 1, unitPrice: 12.5 },
      { name: "Fries", quantity: 1, unitPrice: 5.0 },
      { name: "Coke", quantity: 1, unitPrice: 3.0 },
    ]);
  });

  it("recognizes subtotal, tax, and tip lines and excludes them from items", () => {
    const text = `
Burger        12.50
Subtotal      12.50
Tax            1.00
Tip            2.50
Total         16.00
`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Burger", quantity: 1, unitPrice: 12.5 },
    ]);
    expect(result.subtotal).toBe(12.5);
    expect(result.tax).toBe(1.0);
    expect(result.tip).toBe(2.5);
  });

  it("ignores lines without a trailing price", () => {
    const text = `
WELCOME TO COUPA
ORDER #1234
Thank you!

Latte           4.75
`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Latte", quantity: 1, unitPrice: 4.75 },
    ]);
  });

  it("strips leading dollar signs from prices", () => {
    const text = `Burger        $12.50`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Burger", quantity: 1, unitPrice: 12.5 },
    ]);
  });

  it("returns empty items array when no prices are found", () => {
    const text = "thank you for your visit";
    const result = parseReceiptText(text);
    expect(result.items).toEqual([]);
    expect(result.subtotal).toBeUndefined();
    expect(result.tax).toBeUndefined();
    expect(result.tip).toBeUndefined();
  });

  it("handles 'gratuity' as a tip alias", () => {
    const text = `
Burger        12.50
Gratuity       2.50
`;
    const result = parseReceiptText(text);
    expect(result.tip).toBe(2.5);
    expect(result.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
cd /Users/bauerlee/cover && pnpm test 2>&1 | tail -20
```

Expected: all 6 tests fail with an error like `Cannot find module './parser'` or `parseReceiptText is not exported`.

- [ ] **Step 3: Implement the parser**

Create `/Users/bauerlee/cover/src/lib/ocr/parser.ts`:

```ts
import type { ParsedItem, ParsedReceipt } from "./types";

const PRICE_REGEX = /\$?\s*(\d+\.\d{2})\s*$/;
const SUBTOTAL_KEYWORDS = ["subtotal", "sub total", "sub-total"];
const TAX_KEYWORDS = ["tax", "vat", "gst"];
const TIP_KEYWORDS = ["tip", "gratuity", "service charge"];
const SKIP_KEYWORDS = ["total", "balance", "due", "paid", "change", "card", "cash", "amount"];

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  let subtotal: number | undefined;
  let tax: number | undefined;
  let tip: number | undefined;

  for (const line of lines) {
    const priceMatch = line.match(PRICE_REGEX);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    if (Number.isNaN(price)) continue;

    const matchIndex = priceMatch.index ?? 0;
    const namePart = line.slice(0, matchIndex).trim();
    const lowered = namePart.toLowerCase();

    if (TAX_KEYWORDS.some((k) => lowered.includes(k))) {
      tax = price;
      continue;
    }
    if (TIP_KEYWORDS.some((k) => lowered.includes(k))) {
      tip = price;
      continue;
    }
    if (SUBTOTAL_KEYWORDS.some((k) => lowered.includes(k))) {
      subtotal = price;
      continue;
    }
    if (SKIP_KEYWORDS.some((k) => lowered.includes(k))) {
      continue;
    }
    if (!namePart) continue;

    items.push({ name: namePart, quantity: 1, unitPrice: price });
  }

  return { items, subtotal, tax, tip };
}
```

**Notes on the logic:**
- Order of keyword checks matters: tax/tip/subtotal are matched before `SKIP_KEYWORDS` because "total" appears in "subtotal" and we don't want subtotal to be eaten by the skip rule.
- We never set qty > 1 from parsing — the user adjusts qty manually if needed. Simpler and avoids guessing the "Salad x2  14.00" convention wrong.
- Currency assumed to be USD with `.` decimal. International receipts (commas, €) would need extension — out of scope for this plan.

- [ ] **Step 4: Run tests, confirm they pass**

```bash
cd /Users/bauerlee/cover && pnpm test 2>&1 | tail -20
```

Expected: all 6 tests pass.

- [ ] **Step 5: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/bauerlee/cover && git add src/lib/ocr/parser.ts src/lib/ocr/parser.test.ts && git commit -m "feat: add receipt text parser with unit tests"
```

---

## Task 4: Tesseract.js wrapper

**Files:**
- Create: `/Users/bauerlee/cover/src/lib/ocr/tesseract.ts`

**Note:** Tesseract.js loads a Web Worker + ~10MB of WebAssembly. This file is only imported via dynamic `import()` from `/new/page.tsx`, never statically. Do not import it from any other module.

- [ ] **Step 1: Create the wrapper**

Create `/Users/bauerlee/cover/src/lib/ocr/tesseract.ts`:

```ts
import { createWorker } from "tesseract.js";
import type { ParsedReceipt } from "./types";
import { parseReceiptText } from "./parser";

export async function recognizeReceipt(file: File): Promise<{
  raw: string;
  parsed: ParsedReceipt;
}> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    const raw = data.text;
    const parsed = parseReceiptText(raw);
    return { raw, parsed };
  } finally {
    await worker.terminate();
  }
}
```

**Notes:**
- `createWorker("eng")` downloads the English language model on first call (~3MB, cached by the browser thereafter).
- `worker.terminate()` is in a `finally` so we don't leak the worker if recognition throws.
- Returning both `raw` and `parsed` lets us persist the raw text later (per spec — `receipts.ocr_raw`) once we add receipt storage.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/lib/ocr/tesseract.ts && git commit -m "feat: add Tesseract.js wrapper for receipt recognition"
```

---

## Task 5: Splits API endpoint

**Files:**
- Create: `/Users/bauerlee/cover/src/app/api/splits/route.ts`

- [ ] **Step 1: Create the route handler**

Create `/Users/bauerlee/cover/src/app/api/splits/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { splits, splitItems } from "@/lib/db/schema";

interface CreateSplitPayload {
  name: string;
  tax: number;
  tip: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: CreateSplitPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof payload.name !== "string" ||
    !payload.name.trim() ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const subtotal = payload.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const db = getDb();

  const [newSplit] = await db
    .insert(splits)
    .values({
      hostUserId: user.id,
      name: payload.name.trim(),
      subtotal: subtotal.toFixed(2),
      tax: payload.tax.toFixed(2),
      tip: payload.tip.toFixed(2),
      status: "open",
    })
    .returning({ id: splits.id });

  await db.insert(splitItems).values(
    payload.items.map((item) => ({
      splitId: newSplit.id,
      name: item.name,
      unitPrice: item.unitPrice.toFixed(2),
      quantity: item.quantity,
    }))
  );

  return NextResponse.json({ id: newSplit.id }, { status: 201 });
}
```

**Notes:**
- Auth check is server-side via `createServerClient()` — the proxy in `src/proxy.ts` does NOT cover `/api/splits` for matcher reasons, so we authenticate explicitly here.
- Drizzle numeric columns expect strings, not JS numbers — hence `.toFixed(2)`.
- Subtotal is computed server-side rather than trusting the client number. Defense in depth.
- We use two separate `.insert()` calls rather than a transaction. Drizzle's postgres-js driver supports `db.transaction()` but for two sequential inserts the simpler form is fine; if the second insert fails the orphan split row is recoverable.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/app/api/splits/route.ts && git commit -m "feat: add POST /api/splits to persist bills"
```

---

## Task 6: ReceiptCapture component

**Files:**
- Create: `/Users/bauerlee/cover/src/components/ReceiptCapture.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/bauerlee/cover/src/components/ReceiptCapture.tsx`:

```tsx
"use client";

import { useRef } from "react";

interface ReceiptCaptureProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export function ReceiptCapture({ onSelect, disabled }: ReceiptCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full bg-black text-white rounded-full py-4 font-medium hover:bg-neutral-800 transition disabled:opacity-50"
      >
        Take a photo of the receipt
      </button>
      <p className="text-sm text-neutral-500 text-center">
        On phones, opens the camera. On desktop, opens a file picker.
      </p>
    </div>
  );
}
```

**Notes:**
- `capture="environment"` triggers the rear-facing camera on mobile. Desktop browsers ignore this attribute and show a file picker.
- We reset `e.target.value = ""` so the same file can be selected twice in a row (helpful if user retakes a photo).
- The `<input>` is visually hidden — we trigger it from the styled button. This is the standard pattern for custom file upload UI.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/components/ReceiptCapture.tsx && git commit -m "feat: add ReceiptCapture component with camera/file input"
```

---

## Task 7: ItemEditor component

**Files:**
- Create: `/Users/bauerlee/cover/src/components/ItemEditor.tsx`

- [ ] **Step 1: Create the component**

Create `/Users/bauerlee/cover/src/components/ItemEditor.tsx`:

```tsx
"use client";

import type { ParsedItem } from "@/lib/ocr/types";

interface ItemEditorProps {
  name: string;
  onNameChange: (name: string) => void;
  items: ParsedItem[];
  onItemsChange: (items: ParsedItem[]) => void;
  tax: number;
  onTaxChange: (tax: number) => void;
  tip: number;
  onTipChange: (tip: number) => void;
}

export function ItemEditor({
  name,
  onNameChange,
  items,
  onItemsChange,
  tax,
  onTaxChange,
  tip,
  onTipChange,
}: ItemEditorProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const total = subtotal + tax + tip;

  const updateItem = (index: number, patch: Partial<ParsedItem>) => {
    onItemsChange(
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const deleteItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onItemsChange([...items, { name: "", quantity: 1, unitPrice: 0 }]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="text-sm text-neutral-500 mb-1 block">Bill name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Untitled bill"
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add item
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-neutral-500 py-6 text-center border border-dashed rounded-lg">
            No items yet. Tap &ldquo;Add item&rdquo; to start.
          </p>
        )}

        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2"
          >
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="Item name"
              className="flex-1 min-w-0 text-base"
            />
            <input
              type="number"
              value={item.quantity}
              min={1}
              onChange={(e) =>
                updateItem(index, { quantity: Math.max(1, +e.target.value) })
              }
              className="w-12 text-center text-base"
            />
            <span className="text-neutral-500">×</span>
            <input
              type="number"
              value={item.unitPrice}
              step="0.01"
              min={0}
              onChange={(e) =>
                updateItem(index, { unitPrice: Math.max(0, +e.target.value) })
              }
              className="w-20 text-right text-base"
            />
            <button
              type="button"
              onClick={() => deleteItem(index)}
              className="text-neutral-400 hover:text-red-600 px-1"
              aria-label="Delete item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-neutral-500">Tax</label>
          <input
            type="number"
            value={tax}
            step="0.01"
            min={0}
            onChange={(e) => onTaxChange(Math.max(0, +e.target.value))}
            className="w-24 text-right text-base"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-neutral-500">Tip</label>
          <input
            type="number"
            value={tip}
            step="0.01"
            min={0}
            onChange={(e) => onTipChange(Math.max(0, +e.target.value))}
            className="w-24 text-right text-base"
          />
        </div>
        <div className="flex items-center justify-between text-lg font-semibold border-t pt-2 mt-2">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
```

**Notes:**
- Component is fully controlled — parent owns the state. This makes it easy to wire to `/new/page.tsx`'s state machine and to add validation later.
- Quantity and prices use `<input type="number">` with `min` and `step`. On mobile this brings up the numeric keyboard.
- Item key is `index`. Adequate for this UI because we never reorder. If we add drag-to-reorder later we'd need stable ids.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/components/ItemEditor.tsx && git commit -m "feat: add ItemEditor component with inline editing + totals"
```

---

## Task 8: New bill page (state machine)

**Files:**
- Create: `/Users/bauerlee/cover/src/app/new/page.tsx`

- [ ] **Step 1: Create the page**

Create `/Users/bauerlee/cover/src/app/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { ItemEditor } from "@/components/ItemEditor";
import type { ParsedItem, ParsedReceipt } from "@/lib/ocr/types";

type Stage = "capture" | "loading" | "edit" | "saving" | "error";

export default function NewBillPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("capture");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("Untitled bill");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [tax, setTax] = useState(0);
  const [tip, setTip] = useState(0);

  const handleSelect = async (file: File) => {
    setStage("loading");
    setErrorMsg(null);
    try {
      const { recognizeReceipt } = await import("@/lib/ocr/tesseract");
      const { parsed } = await recognizeReceipt(file);
      applyParsed(parsed);
      setStage("edit");
    } catch (err) {
      console.error("OCR failed:", err);
      // Fall through to manual entry — empty items is fine, user can add
      setStage("edit");
    }
  };

  const applyParsed = (parsed: ParsedReceipt) => {
    setItems(parsed.items);
    if (typeof parsed.tax === "number") setTax(parsed.tax);
    if (typeof parsed.tip === "number") setTip(parsed.tip);
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) {
      setErrorMsg("Add at least one item before saving.");
      return;
    }
    setStage("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items, tax, tip }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Save failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save bill.");
      setStage("edit");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </button>
        <h1 className="font-semibold">New bill</h1>
        <div className="w-12" />
      </header>

      <main className="px-6 py-8 max-w-md mx-auto">
        {stage === "capture" && <ReceiptCapture onSelect={handleSelect} />}

        {stage === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
            <p className="text-neutral-500">Reading receipt…</p>
          </div>
        )}

        {(stage === "edit" || stage === "saving") && (
          <div className="flex flex-col gap-6">
            <ItemEditor
              name={name}
              onNameChange={setName}
              items={items}
              onItemsChange={setItems}
              tax={tax}
              onTaxChange={setTax}
              tip={tip}
              onTipChange={setTip}
            />
            {errorMsg && (
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={stage === "saving"}
              className="w-full bg-black text-white rounded-full py-4 font-medium hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {stage === "saving" ? "Saving…" : "Save bill"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
```

**Notes:**
- Tesseract is imported via dynamic `import()` inside `handleSelect` — this keeps it out of the main bundle. The first call downloads the worker and language model; subsequent calls reuse browser cache.
- If OCR fails (worker crash, bad image), we fall through to `edit` with empty items — the user can add manually. This matches the spec's error handling table.
- `router.refresh()` after save invalidates the dashboard's server-rendered data so the new bill shows up immediately.
- We don't separately handle the `error` stage in the UI — errors during edit/save are surfaced via `errorMsg`. The `error` state in the type is for future use.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/app/new/page.tsx && git commit -m "feat: add /new page state machine wiring capture + OCR + edit + save"
```

---

## Task 9: DraftsList + dashboard update

**Files:**
- Create: `/Users/bauerlee/cover/src/components/DraftsList.tsx`
- Modify: `/Users/bauerlee/cover/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create the DraftsList component**

Create `/Users/bauerlee/cover/src/components/DraftsList.tsx`:

```tsx
import { getDb } from "@/lib/db/client";
import { splits } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function DraftsList({ userId }: { userId: string }) {
  const db = getDb();
  const userSplits = await db
    .select()
    .from(splits)
    .where(eq(splits.hostUserId, userId))
    .orderBy(desc(splits.createdAt))
    .limit(20);

  if (userSplits.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        No bills yet. Tap &ldquo;New bill&rdquo; to add one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {userSplits.map((split) => {
        const subtotal = parseFloat(split.subtotal);
        const tax = parseFloat(split.tax);
        const tip = parseFloat(split.tip);
        const total = subtotal + tax + tip;
        return (
          <li
            key={split.id}
            className="border border-neutral-200 rounded-lg px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{split.name}</p>
              <p className="text-xs text-neutral-500">
                {new Date(split.createdAt).toLocaleDateString()} ·{" "}
                {split.status}
              </p>
            </div>
            <span className="font-medium">${total.toFixed(2)}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

**Notes:**
- This is a Server Component — it queries the DB directly during render. No client-side fetch needed.
- `parseFloat()` on the Drizzle `numeric` strings — those columns return strings, not JS numbers.
- We don't make rows clickable for now. Opening a split detail page is a Plan 3+ concern.

- [ ] **Step 2: Update the dashboard**

Replace the contents of `/Users/bauerlee/cover/src/app/dashboard/page.tsx` with:

```tsx
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import { DraftsList } from "@/components/DraftsList";

export default async function DashboardPage() {
  const supabase = await createServerClient();
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
      <main className="px-6 py-8 max-w-md mx-auto flex flex-col gap-8">
        <div className="text-center">
          <p className="text-neutral-500 mb-1 text-sm">Signed in as</p>
          <p className="font-medium mb-6">{user.email}</p>
          <Link
            href="/new"
            className="inline-block w-full bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 transition"
          >
            New bill
          </Link>
        </div>

        <section>
          <h2 className="text-sm font-medium text-neutral-500 mb-3 uppercase tracking-wide">
            Your bills
          </h2>
          <DraftsList userId={user.id} />
        </section>
      </main>
      <InstallPrompt />
    </div>
  );
}
```

**Notes:**
- Replaces the previously disabled `<button>New bill</button>` with a `<Link href="/new">` — same styling.
- DraftsList is awaited inside a Server Component, so the dashboard SSR renders with bills baked in.

- [ ] **Step 3: Type-check + build**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit && pnpm build 2>&1 | tail -20
```

Expected: type-check clean. Build succeeds with all routes listed: `/`, `/login`, `/dashboard`, `/new`, `/auth/callback`, `/api/auth/signout`, `/api/splits`.

- [ ] **Step 4: Commit**

```bash
cd /Users/bauerlee/cover && git add src/components/DraftsList.tsx src/app/dashboard/page.tsx && git commit -m "feat: enable New bill button and show drafts list on dashboard"
```

---

## Task 10: End-to-end manual smoke test

**Files:** none — verification only.

- [ ] **Step 1: Start dev server**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

Expected: server ready on http://localhost:3000.

- [ ] **Step 2: Browser test the happy path**

In a browser (Chrome desktop is easiest):

1. Visit http://localhost:3000 — should land on `/dashboard` (signed in from prior session)
2. Click **New bill** — should navigate to `/new`
3. Click **Take a photo of the receipt** — desktop opens a file picker. Select any image of a receipt (or a screenshot of a printed receipt). If you don't have one handy, download a test receipt image from Google Images first.
4. Wait for "Reading receipt…" spinner — first run downloads the ~3MB language model, may take 10-30s. Subsequent runs are 2-5s.
5. Edit screen appears with parsed items. Some likely wrong — that's expected for v1.
6. Edit any item names, qty, prices. Add an item with **+ Add item**. Delete one with the ✕.
7. Set a bill name (e.g., "Test bill").
8. Tap **Save bill** — should redirect to `/dashboard`.
9. The new bill should appear in **Your bills** with its name, date, status="open", and total.

- [ ] **Step 3: Test the empty/error paths**

1. Click **New bill** again
2. Click **Take a photo of the receipt** and select a non-receipt image (a photo of nothing). Most likely Tesseract returns no recognizable items — edit screen should appear with empty items list and the prompt "No items yet. Tap Add item to start."
3. Tap **Save bill** with no items — should show the error "Add at least one item before saving."
4. Add one item manually, tap Save — should succeed.

- [ ] **Step 4: Verify the data landed in Supabase**

Supabase dashboard → Table Editor → `splits`. You should see the test bills with your user_id as host_user_id. Click into the row, switch to `split_items` table, filter by `split_id` — should see the items you saved.

- [ ] **Step 5: Stop dev server, push, commit empty (state-only) commit if anything else changed**

Stop the dev server with Ctrl+C. Then:

```bash
cd /Users/bauerlee/cover && git status
```

If clean: nothing to commit. If unexpected files appeared (build artifacts, etc.), inspect them before committing.

- [ ] **Step 6: Push to remote**

```bash
cd /Users/bauerlee/cover && git push 2>&1 | tail -5
```

Expected: push succeeds, Vercel auto-deploys. Wait ~2 min, then visit https://cover-nine-psi.vercel.app and re-run the smoke test on production.

---

## Done with Plan 2

By the end of this plan, you should have:
- A working `/new` flow: capture → OCR → edit → save → dashboard
- Tesseract.js OCR running in-browser, lazy-loaded only on `/new`
- A `parser.test.ts` suite with 6 passing unit tests for the receipt parser
- Splits and split_items rows persisting to Supabase
- A "Your bills" list on the dashboard showing recent bills with totals
- All deployed to https://cover-nine-psi.vercel.app

**Decision gate after Plan 2:** Run 3–5 real receipt photos through the flow (Phi Psi dinner, Coupa cafe, etc.). Measure: what % of items did Tesseract parse correctly? Log to `docs/build-log.md`.

- If >70% accuracy: continue with Tesseract for Plan 3
- If 50–70%: marginal — continue with Tesseract but invest in the parser heuristics
- If <50%: invoke the parent spec's pre-approved $20 Claude vision budget; switch to Claude vision before Plan 3

**Next:** `Plan 3 — Participants + Item Assignment` (add participants, tap items to assign to people, compute per-person totals). Write that plan after this one's accuracy data is collected.
