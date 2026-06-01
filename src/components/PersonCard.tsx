"use client";

import { useState } from "react";

interface PersonCardProps {
  name: string;
  venmoHandle: string | null;
  amount: number;
  paid: boolean;
  onSend: () => Promise<void>;
  onTogglePaid: (paid: boolean) => Promise<void>;
}

export function PersonCard({
  name,
  venmoHandle,
  amount,
  paid,
  onSend,
  onTogglePaid,
}: PersonCardProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await onSend();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleTogglePaid = async () => {
    const next = !paid;
    try {
      await onTogglePaid(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="border border-neutral-200 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-neutral-500">
            {venmoHandle ? `@${venmoHandle}` : "No Venmo on file"}
          </p>
        </div>
        <p className="font-semibold text-lg">${amount.toFixed(2)}</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || paid}
          className="flex-1 bg-black text-white rounded-full py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
        >
          {sending ? "Sharing…" : paid ? "Paid" : "Send"}
        </button>
        <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={paid}
            onChange={handleTogglePaid}
            className="w-4 h-4"
          />
          Paid
        </label>
      </div>
    </div>
  );
}
