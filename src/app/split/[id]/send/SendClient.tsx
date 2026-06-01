"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonCard } from "@/components/PersonCard";
import { buildShareMessage } from "@/lib/venmo/message";
import { nativeShare } from "@/lib/share/web-share";

interface SendParticipant {
  id: string;
  name: string;
  venmoHandle: string | null;
  paid: boolean;
  amount: number;
}

interface SendClientProps {
  splitId: string;
  billName: string;
  billTotal: number;
  hostVenmoHandle: string;
  initialParticipants: SendParticipant[];
}

export function SendClient({
  splitId,
  billName,
  billTotal,
  hostVenmoHandle,
  initialParticipants,
}: SendClientProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async (participant: SendParticipant) => {
    const message = buildShareMessage({
      participantName: participant.name,
      billName,
      amount: participant.amount,
      hostVenmoHandle,
    });
    const result = await nativeShare(message);
    if (result.method === "clipboard") {
      showToast("Message copied — paste it into your text app.");
    }
  };

  const handleTogglePaid = async (
    participant: SendParticipant,
    paid: boolean
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participant.id ? { ...p, paid } : p))
    );
    try {
      const res = await fetch(
        `/api/splits/${splitId}/participants/${participant.id}/paid`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paid }),
        }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participant.id ? { ...p, paid: !paid } : p
        )
      );
      showToast(err instanceof Error ? err.message : "Update failed");
    }
  };

  const allPaid =
    participants.length > 0 && participants.every((p) => p.paid);

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <button
          type="button"
          onClick={() => router.push(`/split/${splitId}`)}
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back
        </button>
        <h1 className="font-semibold">Send</h1>
        <div className="w-12" />
      </header>

      <main className="px-6 py-8 max-w-md mx-auto flex flex-col gap-6">
        <section className="text-center border-b pb-4">
          <p className="text-sm text-neutral-500">{billName}</p>
          <p className="text-2xl font-semibold">${billTotal.toFixed(2)}</p>
        </section>

        {participants.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-8">
            No one to send to. Go back and add participants.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {participants.map((p) => (
              <li key={p.id}>
                <PersonCard
                  name={p.name}
                  venmoHandle={p.venmoHandle}
                  amount={p.amount}
                  paid={p.paid}
                  onSend={() => handleSend(p)}
                  onTogglePaid={(paid) => handleTogglePaid(p, paid)}
                />
              </li>
            ))}
          </ul>
        )}

        {allPaid && (
          <p className="text-sm text-center text-green-700 font-medium">
            All settled. Nice work.
          </p>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 inset-x-6 max-w-md mx-auto bg-black text-white rounded-lg px-4 py-3 text-sm text-center shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
