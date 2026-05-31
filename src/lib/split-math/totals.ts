import type { PerPersonTotal, SplitMathInput } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computePerPersonTotals(
  input: SplitMathInput
): PerPersonTotal[] {
  const { billSubtotal, billTax, billTip, items, participants, assignments } =
    input;

  const itemPriceById = new Map<string, number>();
  for (const item of items) {
    itemPriceById.set(item.id, item.unitPrice * item.quantity);
  }

  return participants.map((participant) => {
    let subtotal = 0;
    for (const assignment of assignments) {
      if (assignment.participantId !== participant.id) continue;
      const itemTotal = itemPriceById.get(assignment.itemId) ?? 0;
      subtotal += itemTotal * assignment.shareFraction;
    }

    const proportion = billSubtotal > 0 ? subtotal / billSubtotal : 0;
    const tax = billTax * proportion;
    const tip = billTip * proportion;
    const total = subtotal + tax + tip;

    return {
      participantId: participant.id,
      subtotal: round2(subtotal),
      tax: round2(tax),
      tip: round2(tip),
      total: round2(total),
    };
  });
}
