import { buildVenmoUrl } from "./url";

interface MessageInput {
  participantName: string;
  billName: string;
  amount: number;
  hostVenmoHandle: string | null;
}

export function buildShareMessage({
  participantName,
  billName,
  amount,
  hostVenmoHandle,
}: MessageInput): string {
  const base = `Hey ${participantName} — your share of ${billName} is $${amount.toFixed(2)}.`;
  if (!hostVenmoHandle) return base;
  const url = buildVenmoUrl({
    recipient: hostVenmoHandle,
    amount,
    note: billName,
  });
  return `${base}\nVenmo me here: ${url}`;
}
