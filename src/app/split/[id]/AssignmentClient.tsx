"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ParticipantList,
  type Participant,
  type FriendOption,
} from "@/components/ParticipantList";
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
  billStatus: "open" | "closed";
  billSubtotal: number;
  billTax: number;
  billTip: number;
  items: Item[];
  initialParticipants: Participant[];
  initialAssignments: Assignment[];
  initialFriends: FriendOption[];
}

export function AssignmentClient({
  splitId,
  billName,
  billStatus,
  billSubtotal,
  billTax,
  billTip,
  items,
  initialParticipants,
  initialAssignments,
  initialFriends,
}: AssignmentClientProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [friends, setFriends] = useState(initialFriends);
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(
    null
  );
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [name, setName] = useState(billName);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(billName);
  const [deleting, setDeleting] = useState(false);

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
        // Silent — participant add is what matters
      }
    }
  };

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
    if (activeParticipantId === participantId) {
      setActiveParticipantId(null);
    }
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

  const availableFriends = useMemo(() => {
    const participantNames = new Set(
      participants.map((p) => p.name.toLowerCase())
    );
    return friends.filter(
      (f) => !participantNames.has(f.name.toLowerCase())
    );
  }, [friends, participants]);

  const toggleItemForActive = async (itemId: string) => {
    if (!activeParticipantId) return;

    const currentAssignees = (assigneesByItem.get(itemId) ?? []).map(
      (p) => p.id
    );
    const isOn = currentAssignees.includes(activeParticipantId);
    const nextAssignees = isOn
      ? currentAssignees.filter((id) => id !== activeParticipantId)
      : [...currentAssignees, activeParticipantId];

    const nextShare =
      nextAssignees.length > 0 ? 1 / nextAssignees.length : 0;
    const previousShare =
      currentAssignees.length > 0 ? 1 / currentAssignees.length : 0;

    // Optimistic: update local state first so taps feel instant
    setAssignments((prev) => [
      ...prev.filter((a) => a.itemId !== itemId),
      ...nextAssignees.map((pid) => ({
        itemId,
        participantId: pid,
        shareFraction: nextShare,
      })),
    ]);

    try {
      const res = await fetch(`/api/splits/${splitId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, participantIds: nextAssignees }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      // Revert
      setAssignments((prev) => [
        ...prev.filter((a) => a.itemId !== itemId),
        ...currentAssignees.map((pid) => ({
          itemId,
          participantId: pid,
          shareFraction: previousShare,
        })),
      ]);
      setGlobalError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const activeIsOnItem = (itemId: string): boolean => {
    if (!activeParticipantId) return false;
    return (assigneesByItem.get(itemId) ?? []).some(
      (p) => p.id === activeParticipantId
    );
  };

  const handleSelectActive = (participantId: string) => {
    setActiveParticipantId((prev) =>
      prev === participantId ? null : participantId
    );
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(name);
      setEditingName(false);
      return;
    }
    if (trimmed === name) {
      setEditingName(false);
      return;
    }
    const previous = name;
    setName(trimmed);
    setEditingName(false);
    try {
      const res = await fetch(`/api/splits/${splitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setName(previous);
      setNameDraft(previous);
      setGlobalError(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(`Delete "${name}"? This permanently removes the bill, all items, participants, and assignments.`)
    ) {
      return;
    }
    setDeleting(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/splits/${splitId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push(billStatus === "closed" ? "/settled" : "/dashboard");
      router.refresh();
    } catch (err) {
      setDeleting(false);
      setGlobalError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between gap-2 px-6 py-4 border-b">
        <button
          type="button"
          onClick={() =>
            router.push(billStatus === "closed" ? "/settled" : "/dashboard")
          }
          className="text-sm text-neutral-500 hover:text-black shrink-0"
        >
          ← Back
        </button>
        {editingName ? (
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveName();
              } else if (e.key === "Escape") {
                setNameDraft(name);
                setEditingName(false);
              }
            }}
            autoFocus
            className="font-semibold text-center bg-transparent border-b border-neutral-300 focus:border-black outline-none min-w-0 flex-1 max-w-[200px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(name);
              setEditingName(true);
            }}
            className="font-semibold truncate hover:underline decoration-dotted underline-offset-4"
            aria-label="Rename bill"
          >
            {name}
          </button>
        )}
        <div className="w-12 shrink-0" />
      </header>

      <main className="px-6 py-8 max-w-md mx-auto flex flex-col gap-8">
        <ParticipantList
          participants={participants}
          availableFriends={availableFriends}
          activeParticipantId={activeParticipantId}
          onSelectActive={handleSelectActive}
          onAdd={handleAddParticipant}
          onAddFromFriend={handleAddFromFriend}
          onRemove={handleRemoveParticipant}
        />

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Items</h2>
            {activeParticipantId ? (
              <p className="text-xs text-neutral-500">
                Tap items to assign / unassign
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                Select a person above first
              </p>
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const assignees = assigneesByItem.get(item.id) ?? [];
              const onItem = activeIsOnItem(item.id);
              const interactive = !!activeParticipantId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleItemForActive(item.id)}
                    disabled={!interactive}
                    className={
                      "w-full text-left rounded-lg px-3 py-3 transition border " +
                      (onItem
                        ? "border-black bg-neutral-50"
                        : "border-neutral-200") +
                      (interactive
                        ? " hover:bg-neutral-50 cursor-pointer"
                        : " cursor-default")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-2">
                        {onItem && (
                          <span
                            aria-hidden="true"
                            className="text-base leading-none"
                          >
                            ✓
                          </span>
                        )}
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-neutral-500">
                            ×{item.quantity}
                          </span>
                        )}
                      </span>
                      <span>
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm mt-1">
                      {assignees.length === 0 ? (
                        <span className="text-neutral-400">unassigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignees.map((a) => (
                            <span
                              key={a.id}
                              className={
                                "rounded-full px-2 py-0.5 text-xs " +
                                (a.id === activeParticipantId
                                  ? "bg-black text-white"
                                  : "bg-neutral-100")
                              }
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

        <a
          href={`/split/${splitId}/send`}
          className="block text-center w-full bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 transition"
        >
          Continue to send
        </a>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="self-center text-sm text-red-600 hover:text-red-800 disabled:opacity-50 transition mt-2"
        >
          {deleting ? "Deleting…" : "Delete bill"}
        </button>
      </main>
    </div>
  );
}
