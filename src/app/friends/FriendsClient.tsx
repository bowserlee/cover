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
