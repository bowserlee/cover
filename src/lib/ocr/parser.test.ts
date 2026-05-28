import { describe, it, expect } from "vitest";
import { parseReceiptText } from "./parser";

describe("parseReceiptText", () => {
  it("extracts items from a simple receipt", () => {
    const text = `
PHI PSI HOUSE
123 Mayfield Ave

Burger          12.50
Fries            5.00
Coke             3.00
`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Burger", quantity: 1, unitPrice: 12.5 },
      { name: "Fries", quantity: 1, unitPrice: 5.0 },
      { name: "Coke", quantity: 1, unitPrice: 3.0 },
    ]);
  });

  it("recognizes subtotal, tax, and tip lines and excludes them from items", () => {
    const text = `
Burger        12.50
Subtotal      12.50
Tax            1.00
Tip            2.50
Total         16.00
`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Burger", quantity: 1, unitPrice: 12.5 },
    ]);
    expect(result.subtotal).toBe(12.5);
    expect(result.tax).toBe(1.0);
    expect(result.tip).toBe(2.5);
  });

  it("ignores lines without a trailing price", () => {
    const text = `
WELCOME TO COUPA
ORDER #1234
Thank you!

Latte           4.75
`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Latte", quantity: 1, unitPrice: 4.75 },
    ]);
  });

  it("strips leading dollar signs from prices", () => {
    const text = `Burger        $12.50`;
    const result = parseReceiptText(text);
    expect(result.items).toEqual([
      { name: "Burger", quantity: 1, unitPrice: 12.5 },
    ]);
  });

  it("returns empty items array when no prices are found", () => {
    const text = "thank you for your visit";
    const result = parseReceiptText(text);
    expect(result.items).toEqual([]);
    expect(result.subtotal).toBeUndefined();
    expect(result.tax).toBeUndefined();
    expect(result.tip).toBeUndefined();
  });

  it("handles 'gratuity' as a tip alias", () => {
    const text = `
Burger        12.50
Gratuity       2.50
`;
    const result = parseReceiptText(text);
    expect(result.tip).toBe(2.5);
    expect(result.items).toHaveLength(1);
  });
});
