"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  initialVenmoHandle: string;
  redirectTo: string;
}

export function ProfileForm({
  initialVenmoHandle,
  redirectTo,
}: ProfileFormProps) {
  const router = useRouter();
  const [venmoHandle, setVenmoHandle] = useState(initialVenmoHandle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venmoHandle.trim()) {
      setError("Venmo handle is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venmoHandle: venmoHandle.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="text-sm text-neutral-500 mb-1 block">
          Your Venmo handle
        </label>
        <input
          type="text"
          value={venmoHandle}
          onChange={(e) => setVenmoHandle(e.target.value)}
          placeholder="bauerlee"
          autoFocus
          className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-base"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Without the @. This is the handle friends will pay you at.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="bg-black text-white rounded-full py-3 font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
