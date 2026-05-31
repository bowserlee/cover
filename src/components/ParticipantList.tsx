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
