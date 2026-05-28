import type { ParsedItem, ParsedReceipt } from "./types";

const PRICE_REGEX = /\$?\s*(\d+\.\d{2})\s*$/;
const SUBTOTAL_KEYWORDS = ["subtotal", "sub total", "sub-total"];
const TAX_KEYWORDS = ["tax", "vat", "gst"];
const TIP_KEYWORDS = ["tip", "gratuity", "service charge"];
const SKIP_KEYWORDS = [
  "total",
  "balance",
  "due",
  "paid",
  "change",
  "card",
  "cash",
  "amount",
];

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  let subtotal: number | undefined;
  let tax: number | undefined;
  let tip: number | undefined;

  for (const line of lines) {
    const priceMatch = line.match(PRICE_REGEX);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    if (Number.isNaN(price)) continue;

    const matchIndex = priceMatch.index ?? 0;
    const namePart = line.slice(0, matchIndex).trim();
    const lowered = namePart.toLowerCase();

    if (TAX_KEYWORDS.some((k) => lowered.includes(k))) {
      tax = price;
      continue;
    }
    if (TIP_KEYWORDS.some((k) => lowered.includes(k))) {
      tip = price;
      continue;
    }
    if (SUBTOTAL_KEYWORDS.some((k) => lowered.includes(k))) {
      subtotal = price;
      continue;
    }
    if (SKIP_KEYWORDS.some((k) => lowered.includes(k))) {
      continue;
    }
    if (!namePart) continue;

    items.push({ name: namePart, quantity: 1, unitPrice: price });
  }

  return { items, subtotal, tax, tip };
}
