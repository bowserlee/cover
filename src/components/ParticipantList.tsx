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
