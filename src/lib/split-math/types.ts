export interface PerPersonTotal {
  participantId: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface SplitMathInput {
  billSubtotal: number;
  billTax: number;
  billTip: number;
  items: Array<{
    id: string;
    unitPrice: number;
    quantity: number;
  }>;
  participants: Array<{ id: string }>;
  assignments: Array<{
    itemId: string;
    participantId: string;
    shareFraction: number;
  }>;
}
