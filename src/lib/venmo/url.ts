interface VenmoUrlInput {
  recipient: string;
  amount: number;
  note: string;
}

export function buildVenmoUrl({
  recipient,
  amount,
  note,
}: VenmoUrlInput): string {
  const cleanRecipient = recipient.replace(/^@/, "");
  const encodedRecipient = encodeURIComponent(cleanRecipient);
  const formattedAmount = amount.toFixed(2);
  const encodedNote = encodeURIComponent(note);
  return `https://venmo.com/${encodedRecipient}?txn=pay&amount=${formattedAmount}&note=${encodedNote}`;
}
