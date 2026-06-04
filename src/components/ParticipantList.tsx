"use client";

import { useState } from "react";
import { AddParticipantForm } from "./AddParticipantForm";

export interface Participant {
  id: string;
  name: string;
  phone: string | null;
  venmoHandle: string | null;
  isHost: boolean;
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
  activeParticipantId: string | null;
  onSelectActive: (participantId: string) => void;
  onAdd: (input: {
    name: string;
    phone?: string;
    venmoHandle?: string;
    saveAsFriend: boolean;
  }) => Promise<void>;
  onAddFromFriend: (friend: FriendOption) => Promise<void>;
  onAddSelf: () => Promise<void>;
  onRemove: (participantId: string) => Promise<void>;
}

export function ParticipantList({
  participants,
  availableFriends,
  activeParticipantId,
  onSelectActive,
  onAdd,
  onAddFromFriend,
  onAddSelf,
  onRemove,
}: ParticipantListProps) {
  const [adding, setAdding] = useState(false);
  const [busyFriendId, setBusyFriendId] = useState<string | null>(null);
  const [busyAddingSelf, setBusyAddingSelf] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const hostAlreadyAdded = participants.some((p) => p.isHost);

  const handleAddSelf = async () => {
    setBusyAddingSelf(true);
    try {
      await onAddSelf();
    } finally {
      setBusyAddingSelf(false);
    }
  };

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

  const handleRemove = async (
    e: React.MouseEvent,
    id: string,
    name: string
  ) => {
    e.stopPropagation();
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
          <div className="flex items-center gap-3 text-sm">
            {!hostAlreadyAdded && (
              <button
                type="button"
                onClick={handleAddSelf}
                disabled={busyAddingSelf}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {busyAddingSelf ? "Adding…" : "+ Me"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              + Add new
            </button>
          </div>
        )}
      </div>

      {participants.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const isActive = p.id === activeParticipantId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelectActive(p.id)}
                  className={
                    "flex items-center gap-1 rounded-full pl-3 pr-1 py-1 text-sm transition " +
                    (isActive
                      ? "bg-black text-white"
                      : "bg-neutral-100 hover:bg-neutral-200")
                  }
                  aria-pressed={isActive}
                >
                  <span>{p.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRemove(e, p.id, p.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleRemove(
                          e as unknown as React.MouseEvent,
                          p.id,
                          p.name
                        );
                      }
                    }}
                    className={
                      "px-1.5 cursor-pointer " +
                      (isActive
                        ? "text-neutral-300 hover:text-red-300"
                        : "text-neutral-400 hover:text-red-600")
                    }
                    aria-label={`Remove ${p.name}`}
                  >
                    ✕
                  </span>
                </button>
              </li>
            );
          })}
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
