# Cover Plan 5: Friends List + Quick-Add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `friends` table + `/friends` page + bill-time quick-add UX. Pull from existing friends with one tap on the assignment screen; new people added there get an optional "Save to friends" checkbox.

**Architecture:** New `friends` table (snapshot model — adding to a bill copies fields into participants). Standard Drizzle CRUD + API endpoints + a list page. The assignment screen's ParticipantList grows a "friends not yet on bill" chip row, and the AddParticipantForm grows a "save to friends" toggle.

**Tech Stack:** Same as the rest of the project.

---

## File Structure

**Files to create:**

| Path | Responsibility |
|---|---|
| `drizzle/0001_friends.sql` | Generated migration |
| `src/app/friends/page.tsx` | Server component — loads friends, renders client |
| `src/app/friends/FriendsClient.tsx` | Client component — add/edit/remove UI |
| `src/app/api/friends/route.ts` | GET (list) + POST (create) |
| `src/app/api/friends/[id]/route.ts` | PATCH (update) + DELETE |

**Files modified:**

| Path | Change |
|---|---|
| `src/lib/db/schema.ts` | Add `friends` table |
| `src/components/ParticipantList.tsx` | Accept `availableFriends` prop, render quick-add chips |
| `src/components/AddParticipantForm.tsx` | Add "Save to friends" checkbox |
| `src/app/split/[id]/AssignmentClient.tsx` | Pass friends down, handle save-to-friends |
| `src/app/split/[id]/page.tsx` | Load friends server-side |
| `src/app/dashboard/page.tsx` | Add "Friends" link in header |

---

## Task 1: Add `friends` table to schema

**Files:**
- Modify: `/Users/bauerlee/cover/src/lib/db/schema.ts`

- [ ] **Step 1: Add table definition**

In `src/lib/db/schema.ts`, append after the existing `receipts` table:

```ts
export const friends = pgTable("friends", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  venmoHandle: text("venmo_handle"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

- [ ] **Step 2: Generate the migration**

```bash
cd /Users/bauerlee/cover && pnpm db:generate
```

Expected: a new `drizzle/0001_*.sql` file is created with `CREATE TABLE "friends"`.

- [ ] **Step 3: Apply migration**

```bash
cd /Users/bauerlee/cover && pnpm db:migrate
```

Expected: migration applied. `friends` table visible in Supabase Table Editor.

- [ ] **Step 4: Commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add friends table for persistent friend roster"
```

---

## Task 2: Friends API endpoints

**Files:**
- Create: `/Users/bauerlee/cover/src/app/api/friends/route.ts`
- Create: `/Users/bauerlee/cover/src/app/api/friends/[id]/route.ts`

- [ ] **Step 1: Create list + create endpoint**

```bash
mkdir -p "/Users/bauerlee/cover/src/app/api/friends/[id]"
```

Create `/Users/bauerlee/cover/src/app/api/friends/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { friends } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

interface CreateFriendPayload {
  name: string;
  phone?: string;
  venmoHandle?: string;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(friends)
    .where(eq(friends.userId, user.id))
    .orderBy(asc(friends.name));

  return NextResponse.json({ friends: rows });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: CreateFriendPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof payload.name !== "string" || !payload.name.trim()) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const cleanVenmo = payload.venmoHandle?.trim().replace(/^@/, "") || null;

  const db = getDb();
  const [created] = await db
    .insert(friends)
    .values({
      userId: user.id,
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      venmoHandle: cleanVenmo,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Create update + delete endpoint**

Create `/Users/bauerlee/cover/src/app/api/friends/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { friends } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface UpdateFriendPayload {
  name?: string;
  phone?: string | null;
  venmoHandle?: string | null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: UpdateFriendPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updates: Partial<typeof friends.$inferInsert> = {};
  if (typeof payload.name === "string") {
    if (!payload.name.trim()) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    updates.name = payload.name.trim();
  }
  if (payload.phone !== undefined) {
    updates.phone = payload.phone?.trim() || null;
  }
  if (payload.venmoHandle !== undefined) {
    updates.venmoHandle = payload.venmoHandle?.trim().replace(/^@/, "") || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(friends)
    .set(updates)
    .where(and(eq(friends.id, id), eq(friends.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const deleted = await db
    .delete(friends)
    .where(and(eq(friends.id, id), eq(friends.userId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Type-check + commit**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add /api/friends CRUD endpoints"
```

---

## Task 3: Friends page

**Files:**
- Create: `/Users/bauerlee/cover/src/app/friends/page.tsx`
- Create: `/Users/bauerlee/cover/src/app/friends/FriendsClient.tsx`

- [ ] **Step 1: Create server page**

```bash
mkdir -p /Users/bauerlee/cover/src/app/friends
```

Create `/Users/bauerlee/cover/src/app/friends/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/client";
import { friends } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { FriendsClient, type Friend } from "./FriendsClient";

export default async function FriendsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = getDb();
  const rows = await db
    .select()
    .from(friends)
    .where(eq(friends.userId, user.id))
    .orderBy(asc(friends.name));

  const initialFriends: Friend[] = rows.map((f) => ({
    id: f.id,
    name: f.name,
    phone: f.phone,
    venmoHandle: f.venmoHandle,
  }));

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </Link>
        <h1 className="font-semibold">Friends</h1>
        <div className="w-12" />
      </header>
      <main className="px-6 py-8 max-w-md mx-auto">
        <FriendsClient initialFriends={initialFriends} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create FriendsClient**

Create `/Users/bauerlee/cover/src/app/friends/FriendsClient.tsx`:

```tsx
"use client";

import { useState } from "react";

export interface Friend {
  id: string;
  name: string;
  phone: string | null;
  venmoHandle: string | null;
}

interface FriendsClientProps {
  initialFriends: Friend[];
}

export function FriendsClient({ initialFriends }: FriendsClientProps) {
  const [list, setList] = useState(initialFriends);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addVenmo, setAddVenmo] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      setError("Name is required");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          phone: addPhone.trim() || undefined,
          venmoHandle: addVenmo.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as Friend;
      setList((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setAddName("");
      setAddPhone("");
      setAddVenmo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from friends?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setList((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  const handleSaveEdit = async (id: string, patch: Partial<Friend>) => {
    setError(null);
    try {
      const res = await fetch(`/api/friends/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as Friend;
      setList((prev) =>
        prev
          .map((f) => (f.id === id ? updated : f))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 border border-neutral-200 rounded-lg p-4"
      >
        <h2 className="font-medium mb-1">Add friend</h2>
        <input
          type="text"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          placeholder="Name"
          className="border border-neutral-200 rounded px-3 py-2 text-base"
        />
        <input
          type="tel"
          value={addPhone}
          onChange={(e) => setAddPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="border border-neutral-200 rounded px-3 py-2 text-base"
        />
        <input
          type="text"
          value={addVenmo}
          onChange={(e) => setAddVenmo(e.target.value)}
          placeholder="Venmo handle (optional)"
          className="border border-neutral-200 rounded px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={adding}
          className="bg-black text-white rounded-full py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
        >
          {adding ? "Adding…" : "Add friend"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Your friends ({list.length})</h2>
        {list.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-6">
            No friends saved yet.
          </p>
        )}
        {list.map((f) => (
          <FriendRow
            key={f.id}
            friend={f}
            editing={editingId === f.id}
            onStartEdit={() => setEditingId(f.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(patch) => handleSaveEdit(f.id, patch)}
            onRemove={() => handleDelete(f.id, f.name)}
          />
        ))}
      </section>
    </div>
  );
}

interface FriendRowProps {
  friend: Friend;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<Friend>) => Promise<void>;
  onRemove: () => void;
}

function FriendRow({
  friend,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRemove,
}: FriendRowProps) {
  const [name, setName] = useState(friend.name);
  const [phone, setPhone] = useState(friend.phone ?? "");
  const [venmo, setVenmo] = useState(friend.venmoHandle ?? "");

  if (!editing) {
    return (
      <div className="border border-neutral-200 rounded-lg p-3 flex items-start justify-between">
        <div>
          <p className="font-medium">{friend.name}</p>
          <p className="text-xs text-neutral-500">
            {friend.venmoHandle ? `@${friend.venmoHandle}` : "no Venmo"}
            {friend.phone ? ` · ${friend.phone}` : ""}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={onStartEdit}
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-3 flex flex-col gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border border-neutral-200 rounded px-2 py-1.5 text-base"
        placeholder="Name"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border border-neutral-200 rounded px-2 py-1.5 text-base"
        placeholder="Phone (optional)"
      />
      <input
        type="text"
        value={venmo}
        onChange={(e) => setVenmo(e.target.value)}
        className="border border-neutral-200 rounded px-2 py-1.5 text-base"
        placeholder="Venmo handle (optional)"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSave({ name, phone: phone || null, venmoHandle: venmo || null })
          }
          className="flex-1 bg-black text-white rounded-full py-1.5 text-sm font-medium hover:bg-neutral-800"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="flex-1 border border-neutral-200 rounded-full py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.5: Type-check + commit**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add /friends page with inline add/edit/remove"
```

---

## Task 4: Add Friends link to dashboard header

**Files:**
- Modify: `/Users/bauerlee/cover/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add the link**

In `src/app/dashboard/page.tsx`, find the header's `<div className="flex items-center gap-4">` and add a Friends link before Settled:

```tsx
<Link
  href="/friends"
  className="text-sm text-neutral-500 hover:text-black transition"
>
  Friends
</Link>
```

So the header order becomes: Friends · Settled · Profile · Sign out.

- [ ] **Step 2: Type-check + commit**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: add Friends link to dashboard header"
```

---

## Task 5: Quick-add chips on assignment screen

**Files:**
- Modify: `/Users/bauerlee/cover/src/components/ParticipantList.tsx`
- Modify: `/Users/bauerlee/cover/src/components/AddParticipantForm.tsx`
- Modify: `/Users/bauerlee/cover/src/app/split/[id]/AssignmentClient.tsx`
- Modify: `/Users/bauerlee/cover/src/app/split/[id]/page.tsx`

- [ ] **Step 1: Add "Save to friends" checkbox to AddParticipantForm**

Replace `/Users/bauerlee/cover/src/components/AddParticipantForm.tsx` with:

```tsx
"use client";

import { useState } from "react";

interface AddParticipantFormProps {
  onAdd: (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
    saveAsFriend: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  showSaveAsFriend: boolean;
}

export function AddParticipantForm({
  onAdd,
  onCancel,
  showSaveAsFriend,
}: AddParticipantFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [venmo, setVenmo] = useState("");
  const [saveAsFriend, setSaveAsFriend] = useState(false);
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
        saveAsFriend,
      });
      setName("");
      setPhone("");
      setVenmo("");
      setSaveAsFriend(false);
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
      {showSaveAsFriend && (
        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsFriend}
            onChange={(e) => setSaveAsFriend(e.target.checked)}
            className="w-4 h-4"
          />
          Also save to friends
        </label>
      )}
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

- [ ] **Step 2: Update ParticipantList to accept availableFriends + show quick-add chips**

Replace `/Users/bauerlee/cover/src/components/ParticipantList.tsx` with:

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

export interface FriendOption {
  id: string;
  name: string;
  phone: string | null;
  venmoHandle: string | null;
}

interface ParticipantListProps {
  participants: Participant[];
  availableFriends: FriendOption[];
  onAdd: (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
    saveAsFriend: boolean;
  }) => Promise<void>;
  onAddFromFriend: (friend: FriendOption) => Promise<void>;
  onRemove: (participantId: string) => Promise<void>;
}

export function ParticipantList({
  participants,
  availableFriends,
  onAdd,
  onAddFromFriend,
  onRemove,
}: ParticipantListProps) {
  const [adding, setAdding] = useState(false);
  const [busyFriendId, setBusyFriendId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleAdd = async (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
    saveAsFriend: boolean;
  }) => {
    await onAdd(input);
    setAdding(false);
  };

  const handleAddFromFriend = async (friend: FriendOption) => {
    setBusyFriendId(friend.id);
    try {
      await onAddFromFriend(friend);
    } finally {
      setBusyFriendId(null);
    }
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">People</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + Add new
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

      {availableFriends.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">
            Add from friends
          </p>
          <ul className="flex flex-wrap gap-2">
            {availableFriends.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={busyFriendId === f.id}
                  onClick={() => handleAddFromFriend(f)}
                  className="border border-neutral-200 hover:border-black rounded-full px-3 py-1 text-sm transition disabled:opacity-50"
                >
                  + {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding && (
        <AddParticipantForm
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
          showSaveAsFriend
        />
      )}

      {participants.length === 0 &&
        availableFriends.length === 0 &&
        !adding && (
          <p className="text-sm text-neutral-500">No people yet.</p>
        )}
    </div>
  );
}
```

- [ ] **Step 3: Update AssignmentClient to wire friends + onAddFromFriend**

Open `/Users/bauerlee/cover/src/app/split/[id]/AssignmentClient.tsx`.

Replace the import of `ParticipantList`:

```tsx
import {
  ParticipantList,
  type Participant,
  type FriendOption,
} from "@/components/ParticipantList";
```

Add a new prop to `AssignmentClientProps` interface — add `initialFriends: FriendOption[]`:

```tsx
interface AssignmentClientProps {
  splitId: string;
  billName: string;
  billSubtotal: number;
  billTax: number;
  billTip: number;
  items: Item[];
  initialParticipants: Participant[];
  initialAssignments: Assignment[];
  initialFriends: FriendOption[];
}
```

Destructure `initialFriends` in the function signature and add state:

```tsx
const [friends, setFriends] = useState(initialFriends);
```

Replace the existing `handleAddParticipant` with:

```tsx
const handleAddParticipant = async (input: {
  name: string;
  phone?: string;
  venmoHandle?: string;
  saveAsFriend: boolean;
}) => {
  const res = await fetch(`/api/splits/${splitId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      phone: input.phone,
      venmoHandle: input.venmoHandle,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const newP = (await res.json()) as Participant;
  setParticipants((prev) => [...prev, newP]);

  if (input.saveAsFriend) {
    // Best-effort save to friends; don't block participant add on this
    try {
      const fRes = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          phone: input.phone,
          venmoHandle: input.venmoHandle,
        }),
      });
      if (fRes.ok) {
        const newFriend = (await fRes.json()) as FriendOption;
        setFriends((prev) =>
          [...prev, newFriend].sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    } catch {
      // Silent — they got added to the bill which is what matters
    }
  }
};
```

Add a handler for adding from a friend (right after `handleAddParticipant`):

```tsx
const handleAddFromFriend = async (friend: FriendOption) => {
  const res = await fetch(`/api/splits/${splitId}/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: friend.name,
      phone: friend.phone ?? undefined,
      venmoHandle: friend.venmoHandle ?? undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    setGlobalError(body.error ?? `HTTP ${res.status}`);
    return;
  }
  const newP = (await res.json()) as Participant;
  setParticipants((prev) => [...prev, newP]);
};
```

Compute the available friends (friends not yet on the bill) — add this near the other `useMemo`s:

```tsx
const availableFriends = useMemo(() => {
  const participantNames = new Set(
    participants.map((p) => p.name.toLowerCase())
  );
  return friends.filter((f) => !participantNames.has(f.name.toLowerCase()));
}, [friends, participants]);
```

Update the `<ParticipantList />` JSX to pass the new props:

```tsx
<ParticipantList
  participants={participants}
  availableFriends={availableFriends}
  onAdd={handleAddParticipant}
  onAddFromFriend={handleAddFromFriend}
  onRemove={handleRemoveParticipant}
/>
```

- [ ] **Step 4: Update split/[id]/page.tsx to load friends**

Open `/Users/bauerlee/cover/src/app/split/[id]/page.tsx`.

Add `friends` to the schema import:

```tsx
import {
  splits,
  splitItems,
  participants,
  itemAssignments,
  friends as friendsTable,
} from "@/lib/db/schema";
```

Before the `return` statement, add a query for friends:

```tsx
const userFriends = await db
  .select()
  .from(friendsTable)
  .where(eq(friendsTable.userId, user.id))
  .orderBy(asc(friendsTable.name));
```

Pass to `AssignmentClient` as the new prop:

```tsx
initialFriends={userFriends.map((f) => ({
  id: f.id,
  name: f.name,
  phone: f.phone,
  venmoHandle: f.venmoHandle,
}))}
```

- [ ] **Step 5: Type-check + build**

```bash
cd /Users/bauerlee/cover && pnpm tsc --noEmit
cd /Users/bauerlee/cover && pnpm build 2>&1 | tail -25
```

Expected: type-check clean, build successful with all routes.

- [ ] **Step 6: Commit**

```bash
cd /Users/bauerlee/cover && git add -A && git commit -m "feat: quick-add friends to bills + Save to friends checkbox"
```

---

## Task 6: End-to-end smoke test + push

- [ ] **Step 1: Start dev server**

```bash
cd /Users/bauerlee/cover && pnpm dev
```

- [ ] **Step 2: Friends page test**

1. http://localhost:3000/dashboard → click **Friends** in header
2. Add 3 friends: "Alex" (with Venmo @alex), "Sam" (with phone), "Maya" (just name)
3. Edit one → change Venmo handle → save → confirm updated
4. Remove one → confirm prompt → removed

- [ ] **Step 3: Bill quick-add test**

1. Open any existing bill (or create a new one)
2. People section should show "Add from friends" with the remaining friends as chips
3. Tap a friend chip → they appear as a participant, disappear from the quick-add row
4. Tap "+ Add new" → enter a name "Bob", check "Also save to friends", Add → Bob appears as a participant
5. Go to `/friends` → Bob should be in the list
6. Refresh the bill page → state persists

- [ ] **Step 4: Item assignment still scoped to bill**

1. On the bill, tap an item → modal opens
2. Modal should show ONLY the people on this bill (not the full friends list)

- [ ] **Step 5: Push to production**

```bash
cd /Users/bauerlee/cover && git push
```

Wait ~2 min for Vercel.

---

## Done with Plan 5

By the end of this plan:
- `/friends` page for managing your roster
- Bill assignment screen has a "quick add from friends" row
- New-on-bill people can be optionally saved as friends
- All persistence works; item assignment modal still scoped to bill only
