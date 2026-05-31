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
