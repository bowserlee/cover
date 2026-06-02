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
