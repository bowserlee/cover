# Cover Plan 3: Participants + Item Assignment + Per-Person Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the assignment screen at `/split/[id]`: open a saved bill, add participants (name + optional phone/Venmo), tap items to open a checkbox modal and assign people, see live per-person totals with proportional tax + tip. Auto-save every change. Stops before the Venmo + share step (Plan 4).

**Architecture:** Server component at `/split/[id]/page.tsx` loads bill + items + participants + assignments from Drizzle. Hands off to `AssignmentClient.tsx` for interactivity. Three new API endpoints handle participant CRUD and assignment-set replacement (PUT replaces the full set per item — atomic delete-old + insert-new in a transaction). Per-person totals are a pure function (`split-math/totals.ts`, vitest-tested).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Drizzle ORM, vitest (already configured in Plan 2), Supabase Postgres (already provisioned).

---

## File Structure

**Files to create:**

| Path | Responsibility |
|---|---|
| `src/lib/split-math/types.ts` | `PerPersonTotal` shared type |
| `src/lib/split-math/totals.ts` | Pure function for per-person totals (with tax/tip allocation) |
| `src/lib/split-math/totals.test.ts` | Vitest unit tests |
| `src/components/ParticipantList.tsx` | Chip-style pills + "+ Add" trigger |
| `src/components/AddParticipantForm.tsx` | Inline form for name + optional phone/Venmo |
| `src/components/AssignmentModal.tsx` | Checkbox modal for assigning an item to participants |
| `src/app/split/[id]/page.tsx` | Server component, loads bill data |
| `src/app/split/[id]/AssignmentClient.tsx` | Client component with all interactive logic |
| `src/app/split/[id]/not-found.tsx` | 404 for missing/unauthorized splits |
| `src/app/api/splits/[id]/participants/route.ts` | POST + DELETE for participants |
| `src/app/api/splits/[id]/assignments/route.ts` | PUT for item assignments |

**Files modified:**

| Path | Change |
|---|---|
| `src/components/DraftsList.tsx` | Wrap each list item in `<Link href="/split/{id}">` |

---

## Task 1: Per-person totals types

**Files:**
- Create: `/Users/bauerlee/cover/src/lib/split-math/types.ts`

- [ ] **Step 1: Create the types file**

Create `/Users/bauerlee/cover/src/lib/split-math/types.ts`:

```ts
export interface PerPersonTotal {
  participantId: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface SplitMathInput {
  billSubtotal: number;
  billTax: number;
  billTip: number;
  items: Array<{
    id: string;
    unitPrice: number;
    quantity: number;
  }>;
  participants: Array<{ id: string }>;
  assignments: Array<{
    itemId: string;
    participantId: string;
    shareFraction: number;
  }>;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/lib/split-math/types.ts && git commit -m "feat: add PerPersonTotal and SplitMathInput types"
```

---

## Task 2: Per-person totals math (TDD)

**Files:**
- Create: `/Users/bauerlee/cover/src/lib/split-math/totals.test.ts`
- Create: `/Users/bauerlee/cover/src/lib/split-math/totals.ts`

**Note:** Strict TDD. Tests first, see them fail, then implement.

- [ ] **Step 1: Write failing tests**

Create `/Users/bauerlee/cover/src/lib/split-math/totals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computePerPersonTotals } from "./totals";

describe("computePerPersonTotals", () => {
  it("returns zeros when no items are assigned", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }],
      assignments: [],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 0, tax: 0, tip: 0, total: 0 },
      { participantId: "p2", subtotal: 0, tax: 0, tip: 0, total: 0 },
    ]);
  });

  it("allocates proportional tax and tip on a single-assignee item", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }],
      assignments: [{ itemId: "i1", participantId: "p1", shareFraction: 1 }],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 20, tax: 2, tip: 4, total: 26 },
    ]);
  });

  it("splits an item evenly between two assignees", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }],
      assignments: [
        { itemId: "i1", participantId: "p1", shareFraction: 0.5 },
        { itemId: "i1", participantId: "p2", shareFraction: 0.5 },
      ],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 10, tax: 1, tip: 2, total: 13 },
      { participantId: "p2", subtotal: 10, tax: 1, tip: 2, total: 13 },
    ]);
  });

  it("handles quantity > 1 by multiplying unit price", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 0,
      billTip: 0,
      items: [{ id: "i1", unitPrice: 10, quantity: 2 }],
      participants: [{ id: "p1" }],
      assignments: [{ itemId: "i1", participantId: "p1", shareFraction: 1 }],
    });
    expect(result[0].subtotal).toBe(20);
    expect(result[0].total).toBe(20);
  });

  it("handles bill subtotal of zero without dividing by zero", () => {
    const result = computePerPersonTotals({
      billSubtotal: 0,
      billTax: 2,
      billTip: 4,
      items: [],
      participants: [{ id: "p1" }],
      assignments: [],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 0, tax: 0, tip: 0, total: 0 },
    ]);
  });

  it("rounds totals to 2 decimal places", () => {
    const result = computePerPersonTotals({
      billSubtotal: 10,
      billTax: 1,
      billTip: 0,
      items: [{ id: "i1", unitPrice: 10, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
      assignments: [
        { itemId: "i1", participantId: "p1", shareFraction: 1 / 3 },
        { itemId: "i1", participantId: "p2", shareFraction: 1 / 3 },
        { itemId: "i1", participantId: "p3", shareFraction: 1 / 3 },
      ],
    });
    // Each person: subtotal $3.33, tax $0.33, total $3.67 (rounded from 3.6666...)
    expect(result[0].subtotal).toBeCloseTo(3.33, 2);
    expect(result[0].total).toBeCloseTo(3.67, 2);
  });

  it("returns 0 for participants with no assignments even when others have them", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }],
      assignments: [{ itemId: "i1", participantId: "p1", shareFraction: 1 }],
    });
    expect(result.find((r) => r.participantId === "p2")).toEqual({
      participantId: "p2",
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests, confirm failure**

```bash
cd /Users/bauerlee/cover && pnpm test 2>&1 | tail -10
```

Expected: tests fail because `totals.ts` doesn't export `computePerPersonTotals` yet.

- [ ] **Step 3: Implement the function**

Create `/Users/bauerlee/cover/src/lib/split-math/totals.ts`:

```ts
import type { PerPersonTotal, SplitMathInput } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computePerPersonTotals(
  input: SplitMathInput
): PerPersonTotal[] {
  const { billSubtotal, billTax, billTip, items, participants, assignments } =
    input;

  const itemPriceById = new Map<string, number>();
  for (const item of items) {
    itemPriceById.set(item.id, item.unitPrice * item.quantity);
  }

  return participants.map((participant) => {
    let subtotal = 0;
    for (const assignment of assignments) {
      if (assignment.participantId !== participant.id) continue;
      const itemTotal = itemPriceById.get(assignment.itemId) ?? 0;
      subtotal += itemTotal * assignment.shareFraction;
    }

    const proportion = billSubtotal > 0 ? subtotal / billSubtotal : 0;
    const tax = billTax * proportion;
    const tip = billTip * proportion;
    const total = subtotal + tax + tip;

    return {
      participantId: participant.id,
      subtotal: round2(subtotal),
      tax: round2(tax),
      tip: round2(tip),
      total: round2(total),
    };
  });
}
```

- [ ] **Step 4: Run tests, confirm all pass**

```bash
cd /Users/bauerlee/cover && pnpm test 2>&1 | tail -10
```

Expected: 7 tests pass in `totals.test.ts`, 6 tests pass in `parser.test.ts` (from Plan 2). Total 13 passing.

- [ ] **Step 5: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/bauerlee/cover && git add src/lib/split-math/ && git commit -m "feat: add per-person totals math with proportional tax/tip allocation"
```

---

## Task 3: Participants API endpoint

**Files:**
- Create: `/Users/bauerlee/cover/src/app/api/splits/[id]/participants/route.ts`

- [ ] **Step 1: Create the route handler**

Create `/Users/bauerlee/cover/src/app/api/splits/[id]/participants/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { splits, participants, itemAssignments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface AddParticipantPayload {
  name: string;
  phone?: string;
  venmoHandle?: string;
}

async function ownsSplit(splitId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: splits.id })
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, userId)))
    .limit(1);
  return !!row;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: splitId } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await ownsSplit(splitId, user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: AddParticipantPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const db = getDb();
  const [newParticipant] = await db
    .insert(participants)
    .values({
      splitId,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      venmoHandle: payload.venmoHandle?.trim() || null,
    })
    .returning({
      id: participants.id,
      name: participants.name,
      phone: participants.phone,
      venmoHandle: participants.venmoHandle,
    });

  return NextResponse.json(newParticipant, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: splitId } = await context.params;
  const url = new URL(request.url);
  const participantId = url.searchParams.get("participantId");
  if (!participantId) {
    return NextResponse.json({ error: "missing_participantId" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await ownsSplit(splitId, user.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const db = getDb();

  // Block delete if participant has any assignments
  const [existingAssignment] = await db
    .select({ id: itemAssignments.id })
    .from(itemAssignments)
    .where(eq(itemAssignments.participantId, participantId))
    .limit(1);
  if (existingAssignment) {
    return NextResponse.json(
      { error: "has_assignments" },
      { status: 409 }
    );
  }

  await db
    .delete(participants)
    .where(
      and(eq(participants.id, participantId), eq(participants.splitId, splitId))
    );

  return NextResponse.json({ ok: true });
}
```

**Notes:**
- Both handlers do an ownership check via `ownsSplit()` before any mutation. Without this, anyone with a valid session could mutate any bill.
- DELETE uses a query param for `participantId` because URL routing already consumed `/api/splits/[id]/participants` — query is the cleanest way to pass a second id.
- DELETE blocks if assignments exist (409 Conflict). Frontend will handle this by showing an inline error and prompting the user to unassign first.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/app/api/splits/ && git commit -m "feat: add POST + DELETE /api/splits/[id]/participants"
```

---

## Task 4: Assignments API endpoint

**Files:**
- Create: `/Users/bauerlee/cover/src/app/api/splits/[id]/assignments/route.ts`

- [ ] **Step 1: Create the route handler**

Create `/Users/bauerlee/cover/src/app/api/splits/[id]/assignments/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import {
  splits,
  splitItems,
  itemAssignments,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface PutAssignmentsPayload {
  itemId: string;
  participantIds: string[];
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: splitId } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [splitRow] = await db
    .select({ id: splits.id })
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, user.id)))
    .limit(1);
  if (!splitRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let payload: PutAssignmentsPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    typeof payload.itemId !== "string" ||
    !Array.isArray(payload.participantIds)
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Verify item belongs to this split
  const [itemRow] = await db
    .select({ id: splitItems.id })
    .from(splitItems)
    .where(
      and(eq(splitItems.id, payload.itemId), eq(splitItems.splitId, splitId))
    )
    .limit(1);
  if (!itemRow) {
    return NextResponse.json({ error: "item_not_in_split" }, { status: 400 });
  }

  const shareFraction =
    payload.participantIds.length > 0
      ? 1 / payload.participantIds.length
      : 0;

  // Atomic delete-old + insert-new
  await db.transaction(async (tx) => {
    await tx
      .delete(itemAssignments)
      .where(eq(itemAssignments.itemId, payload.itemId));

    if (payload.participantIds.length > 0) {
      await tx.insert(itemAssignments).values(
        payload.participantIds.map((participantId) => ({
          itemId: payload.itemId,
          participantId,
          shareFraction: shareFraction.toFixed(4),
        }))
      );
    }
  });

  return NextResponse.json({ ok: true, shareFraction });
}
```

**Notes:**
- PUT-replaces-set: client sends the full intended participant list for an item, server deletes old assignments and inserts the new ones in a transaction. Naturally idempotent — repeated calls with the same payload give the same result.
- Empty `participantIds` array unassigns the item completely.
- `shareFraction` is computed server-side (even split). Server doesn't trust the client's math.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/app/api/splits/ && git commit -m "feat: add PUT /api/splits/[id]/assignments with atomic set replacement"
```

---

## Task 5: ParticipantList + AddParticipantForm components

**Files:**
- Create: `/Users/bauerlee/cover/src/components/AddParticipantForm.tsx`
- Create: `/Users/bauerlee/cover/src/components/ParticipantList.tsx`

- [ ] **Step 1: Create AddParticipantForm**

Create `/Users/bauerlee/cover/src/components/AddParticipantForm.tsx`:

```tsx
"use client";

import { useState } from "react";

interface AddParticipantFormProps {
  onAdd: (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function AddParticipantForm({ onAdd, onCancel }: AddParticipantFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [venmo, setVenmo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onAdd({
        name: name.trim(),
        phone: phone.trim() || undefined,
        venmoHandle: venmo.trim() || undefined,
      });
      setName("");
      setPhone("");
      setVenmo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border border-neutral-200 rounded-lg p-3 flex flex-col gap-2"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoFocus
        className="border border-neutral-200 rounded px-2 py-1.5 text-base"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional)"
        className="border border-neutral-200 rounded px-2 py-1.5 text-base"
      />
      <input
        type="text"
        value={venmo}
        onChange={(e) => setVenmo(e.target.value)}
        placeholder="Venmo handle (optional)"
        className="border border-neutral-200 rounded px-2 py-1.5 text-base"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 bg-black text-white rounded-full py-1.5 text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 border border-neutral-200 rounded-full py-1.5 text-sm hover:bg-neutral-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create ParticipantList**

Create `/Users/bauerlee/cover/src/components/ParticipantList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AddParticipantForm } from "./AddParticipantForm";

export interface Participant {
  id: string;
  name: string;
  phone: string | null;
  venmoHandle: string | null;
}

interface ParticipantListProps {
  participants: Participant[];
  onAdd: (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
  }) => Promise<void>;
  onRemove: (participantId: string) => Promise<void>;
}

export function ParticipantList({
  participants,
  onAdd,
  onRemove,
}: ParticipantListProps) {
  const [adding, setAdding] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleAdd = async (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
  }) => {
    await onAdd(input);
    setAdding(false);
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    setRemoveError(null);
    try {
      await onRemove(id);
    } catch (err) {
      setRemoveError(
        err instanceof Error ? err.message : "Cannot remove"
      );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">People</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add
          </button>
        )}
      </div>

      {participants.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-1 bg-neutral-100 rounded-full pl-3 pr-1 py-1 text-sm"
            >
              <span>{p.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(p.id, p.name)}
                className="text-neutral-400 hover:text-red-600 px-1.5"
                aria-label={`Remove ${p.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {removeError && (
        <p className="text-xs text-red-600">{removeError}</p>
      )}

      {adding && (
        <AddParticipantForm
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {participants.length === 0 && !adding && (
        <p className="text-sm text-neutral-500">No people yet.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/bauerlee/cover && git add src/components/AddParticipantForm.tsx src/components/ParticipantList.tsx && git commit -m "feat: add ParticipantList + AddParticipantForm components"
```

---

## Task 6: AssignmentModal component

**Files:**
- Create: `/Users/bauerlee/cover/src/components/AssignmentModal.tsx`

- [ ] **Step 1: Create the modal**

Create `/Users/bauerlee/cover/src/components/AssignmentModal.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import type { Participant } from "./ParticipantList";

interface AssignmentModalProps {
  itemName: string;
  participants: Participant[];
  initialAssigneeIds: string[];
  onClose: () => void;
  onSave: (participantIds: string[]) => Promise<void>;
}

export function AssignmentModal({
  itemName,
  participants,
  initialAssigneeIds,
  onClose,
  onSave,
}: AssignmentModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialAssigneeIds)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(Array.from(selected));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm text-neutral-500">Who had</p>
          <h2 className="text-xl font-semibold">{itemName}?</h2>
        </div>

        {participants.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center">
            Add people first.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {participants.map((p) => {
              const isChecked = selected.has(p.id);
              return (
                <li key={p.id}>
                  <label className="flex items-center gap-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(p.id)}
                      className="w-5 h-5"
                    />
                    <span className="text-base">{p.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-neutral-200 rounded-full py-2.5 text-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 bg-black text-white rounded-full py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Notes:**
- Clicking the backdrop or hitting Escape closes the modal (Plan-2-grade UX from day 1).
- Mobile: anchored to bottom (`items-end`). Desktop: centered (`sm:items-center`).
- `stopPropagation` on inner div prevents the backdrop click from firing when interacting with form.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/components/AssignmentModal.tsx && git commit -m "feat: add AssignmentModal with backdrop + escape + checkbox list"
```

---

## Task 7: AssignmentClient (the big one)

**Files:**
- Create: `/Users/bauerlee/cover/src/app/split/[id]/AssignmentClient.tsx`

- [ ] **Step 1: Create the client component**

Create `/Users/bauerlee/cover/src/app/split/[id]/AssignmentClient.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ParticipantList, type Participant } from "@/components/ParticipantList";
import { AssignmentModal } from "@/components/AssignmentModal";
import { computePerPersonTotals } from "@/lib/split-math/totals";

interface Item {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface Assignment {
  itemId: string;
  participantId: string;
  shareFraction: number;
}

interface AssignmentClientProps {
  splitId: string;
  billName: string;
  billSubtotal: number;
  billTax: number;
  billTip: number;
  items: Item[];
  initialParticipants: Participant[];
  initialAssignments: Assignment[];
}

export function AssignmentClient({
  splitId,
  billName,
  billSubtotal,
  billTax,
  billTip,
  items,
  initialParticipants,
  initialAssignments,
}: AssignmentClientProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      computePerPersonTotals({
        billSubtotal,
        billTax,
        billTip,
        items,
        participants,
        assignments,
      }),
    [billSubtotal, billTax, billTip, items, participants, assignments]
  );

  const billTotal = billSubtotal + billTax + billTip;
  const assignedSum = totals.reduce((sum, t) => sum + t.total, 0);

  const handleAddParticipant = async (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
  }) => {
    const res = await fetch(`/api/splits/${splitId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const newP = (await res.json()) as Participant;
    setParticipants((prev) => [...prev, newP]);
  };

  const handleRemoveParticipant = async (participantId: string) => {
    const res = await fetch(
      `/api/splits/${splitId}/participants?participantId=${participantId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === "has_assignments") {
        throw new Error("Unassign this person from items first.");
      }
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleSaveAssignment = async (
    itemId: string,
    participantIds: string[]
  ) => {
    const res = await fetch(`/api/splits/${splitId}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, participantIds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const { shareFraction } = (await res.json()) as { shareFraction: number };
    setAssignments((prev) => [
      ...prev.filter((a) => a.itemId !== itemId),
      ...participantIds.map((pid) => ({
        itemId,
        participantId: pid,
        shareFraction,
      })),
    ]);
  };

  const assigneesByItem = useMemo(() => {
    const map = new Map<string, Participant[]>();
    for (const a of assignments) {
      const p = participants.find((x) => x.id === a.participantId);
      if (!p) continue;
      const list = map.get(a.itemId) ?? [];
      list.push(p);
      map.set(a.itemId, list);
    }
    return map;
  }, [assignments, participants]);

  const openItem = openItemId ? items.find((i) => i.id === openItemId) : null;
  const openItemAssignees = openItemId
    ? (assigneesByItem.get(openItemId) ?? []).map((p) => p.id)
    : [];

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
        <h1 className="font-semibold">{billName}</h1>
        <div className="w-12" />
      </header>

      <main className="px-6 py-8 max-w-md mx-auto flex flex-col gap-8">
        <ParticipantList
          participants={participants}
          onAdd={handleAddParticipant}
          onRemove={handleRemoveParticipant}
        />

        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Items</h2>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const assignees = assigneesByItem.get(item.id) ?? [];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpenItemId(item.id)}
                    className="w-full text-left border border-neutral-200 rounded-lg px-3 py-3 hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-neutral-500">
                            {" "}
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                      <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="text-sm mt-1">
                      {assignees.length === 0 ? (
                        <span className="text-neutral-400">tap to assign</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignees.map((a) => (
                            <span
                              key={a.id}
                              className="bg-neutral-100 rounded-full px-2 py-0.5 text-xs"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-1 border-t pt-4">
          <h2 className="font-medium mb-2">Totals</h2>
          {participants.length === 0 && (
            <p className="text-sm text-neutral-500">
              Add people to see totals.
            </p>
          )}
          {totals.map((t) => {
            const p = participants.find((x) => x.id === t.participantId);
            if (!p) return null;
            return (
              <div
                key={t.participantId}
                className="flex items-center justify-between py-1"
              >
                <span>{p.name}</span>
                <span className="font-medium">${t.total.toFixed(2)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between text-xs text-neutral-500 border-t pt-2 mt-2">
            <span>Total assigned</span>
            <span>
              ${assignedSum.toFixed(2)} / ${billTotal.toFixed(2)}
            </span>
          </div>
        </section>

        {globalError && (
          <p className="text-sm text-red-600 text-center">{globalError}</p>
        )}

        <button
          type="button"
          disabled
          className="w-full bg-black text-white rounded-full py-3 font-medium opacity-50 cursor-not-allowed"
        >
          Continue to send (Plan 4)
        </button>
      </main>

      {openItem && (
        <AssignmentModal
          itemName={openItem.name}
          participants={participants}
          initialAssigneeIds={openItemAssignees}
          onClose={() => setOpenItemId(null)}
          onSave={async (participantIds) => {
            try {
              await handleSaveAssignment(openItem.id, participantIds);
            } catch (err) {
              setGlobalError(
                err instanceof Error ? err.message : "Save failed"
              );
              throw err;
            }
          }}
        />
      )}
    </div>
  );
}
```

**Notes:**
- All async handlers throw on failure so child components can show their own errors. Parent also catches for global error display.
- Optimistic UI: state updates after the API call succeeds, not before. Simpler than full optimistic (rollback on failure) and acceptable since these calls are fast.
- `useMemo` on totals + assignees map prevents recomputing every render.
- "Continue to send" disabled — Plan 4 will enable it.

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/app/split/ && git commit -m "feat: add AssignmentClient orchestrating the split detail screen"
```

---

## Task 8: Split detail server page + not-found

**Files:**
- Create: `/Users/bauerlee/cover/src/app/split/[id]/page.tsx`
- Create: `/Users/bauerlee/cover/src/app/split/[id]/not-found.tsx`

- [ ] **Step 1: Create the server page**

Create `/Users/bauerlee/cover/src/app/split/[id]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import {
  splits,
  splitItems,
  participants,
  itemAssignments,
} from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { AssignmentClient } from "./AssignmentClient";

export default async function SplitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: splitId } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [split] = await db
    .select()
    .from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.hostUserId, user.id)))
    .limit(1);
  if (!split) notFound();

  const items = await db
    .select()
    .from(splitItems)
    .where(eq(splitItems.splitId, splitId))
    .orderBy(asc(splitItems.name));

  const splitParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.splitId, splitId))
    .orderBy(asc(participants.name));

  const assignments = await db
    .select({
      itemId: itemAssignments.itemId,
      participantId: itemAssignments.participantId,
      shareFraction: itemAssignments.shareFraction,
    })
    .from(itemAssignments)
    .innerJoin(splitItems, eq(itemAssignments.itemId, splitItems.id))
    .where(eq(splitItems.splitId, splitId));

  return (
    <AssignmentClient
      splitId={split.id}
      billName={split.name}
      billSubtotal={parseFloat(split.subtotal)}
      billTax={parseFloat(split.tax)}
      billTip={parseFloat(split.tip)}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        unitPrice: parseFloat(i.unitPrice),
        quantity: i.quantity,
      }))}
      initialParticipants={splitParticipants.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        venmoHandle: p.venmoHandle,
      }))}
      initialAssignments={assignments.map((a) => ({
        itemId: a.itemId,
        participantId: a.participantId,
        shareFraction: parseFloat(a.shareFraction),
      }))}
    />
  );
}
```

- [ ] **Step 2: Create the not-found page**

Create `/Users/bauerlee/cover/src/app/split/[id]/not-found.tsx`:

```tsx
import Link from "next/link";

export default function SplitNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-semibold mb-2">Bill not found</h1>
      <p className="text-neutral-500 mb-6 text-center">
        It may have been deleted, or you don&rsquo;t have access to it.
      </p>
      <Link
        href="/dashboard"
        className="bg-black text-white rounded-full px-6 py-2 text-sm font-medium"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + build**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit && pnpm build 2>&1 | tail -25
```

Expected: type-check clean. Build lists `/split/[id]` route. All other routes still present.

- [ ] **Step 4: Commit**

```bash
cd /Users/bauerlee/cover && git add src/app/split/ && git commit -m "feat: add server page for /split/[id] loading bill + items + participants + assignments"
```

---

## Task 9: Wire dashboard drafts list to /split/[id]

**Files:**
- Modify: `/Users/bauerlee/cover/src/components/DraftsList.tsx`

- [ ] **Step 1: Wrap each list item in a Link**

Replace `/Users/bauerlee/cover/src/components/DraftsList.tsx` with:

```tsx
import Link from "next/link";
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
          <li key={split.id}>
            <Link
              href={`/split/${split.id}`}
              className="block border border-neutral-200 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition"
            >
              <div>
                <p className="font-medium">{split.name}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(split.createdAt).toLocaleDateString()} ·{" "}
                  {split.status}
                </p>
              </div>
              <span className="font-medium">${total.toFixed(2)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/bauerlee/cover && git add src/components/DraftsList.tsx && git commit -m "feat: link drafts list rows to /split/[id]"
```

---

## Task 10: End-to-end smoke test + push

**Files:** none — verification only.

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/bauerlee/cover && pnpm test 2>&1 | tail -10
```

Expected: 13 tests pass (6 parser + 7 totals).

- [ ] **Step 2: Start dev server**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

Expected: server ready at http://localhost:3000.

- [ ] **Step 3: Browser test — happy path**

1. Visit http://localhost:3000/dashboard
2. Click any existing saved bill in "Your bills"
3. Should land on `/split/[id]` with bill name + items already there + empty participants
4. Tap **+ Add** next to People → fill in a name → Add → name appears as a chip
5. Add 2 more participants
6. Tap any item → modal opens with 3 checkboxes
7. Check 2 of them → tap **Done** → modal closes, item row shows 2 names
8. Repeat for a few items with different combos (1 person, 3 people, etc.)
9. Watch Totals section update live
10. Verify "Total assigned / Bill total" lines reconcile (small rounding diff acceptable)
11. Tap **← Back** to dashboard
12. Re-open the same bill — all participants + assignments persisted

- [ ] **Step 4: Browser test — edge cases**

1. Tap an unassigned item, open modal, check no one, tap Done → item shows "tap to assign" again
2. Tap an assigned item, uncheck someone, tap Done → totals shift
3. Try to remove a participant who has assignments → confirm dialog → see inline error "Unassign this person from items first"
4. Open `/split/somefakeid` directly in URL → see the not-found page

- [ ] **Step 5: Verify data in Supabase**

Supabase dashboard → Table Editor:
- `participants` — your test participants present
- `item_assignments` — rows for each (item, participant) pair you created with the right `share_fraction`

- [ ] **Step 6: Stop dev server, commit any drift, push**

Ctrl+C the dev server. Then:

```bash
cd /Users/bauerlee/cover && git status
```

If clean: nothing to commit. If unexpected changes: review before committing.

```bash
cd /Users/bauerlee/cover && git push 2>&1 | tail -5
```

Expected: push succeeds, Vercel auto-deploys. Wait ~2 min, then re-run a quick happy-path smoke test on production.

---

## Done with Plan 3

By the end of this plan, you should have:
- `/split/[id]` route showing bill detail with assignment screen
- Participants stored and persisted in Supabase, addable/removable from UI
- Item assignment via tap-then-checkbox-modal pattern
- Live per-person totals with proportional tax + tip allocation
- 13 passing vitest tests (6 parser + 7 totals)
- Deployed to https://cover-nine-psi.vercel.app

**Cover is now a 95%-complete bill-splitting product. Only Plan 4 (Venmo deep links + Web Share) is left for the magic moment to complete.**

**Next:** Plan 4 — Venmo deep linking + Web Share API + per-person send. Write that plan when this one is done.
