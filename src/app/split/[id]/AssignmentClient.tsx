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

        <a
          href={`/split/${splitId}/send`}
          className="block text-center w-full bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 transition"
        >
          Continue to send
        </a>
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
