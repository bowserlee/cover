import { describe, it, expect } from "vitest";
import { computePerPersonTotals } from "./totals";

describe("computePerPersonTotals", () => {
  it("returns zeros when no items are assigned", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }],
      assignments: [],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 0, tax: 0, tip: 0, total: 0 },
      { participantId: "p2", subtotal: 0, tax: 0, tip: 0, total: 0 },
    ]);
  });

  it("allocates proportional tax and tip on a single-assignee item", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }],
      assignments: [{ itemId: "i1", participantId: "p1", shareFraction: 1 }],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 20, tax: 2, tip: 4, total: 26 },
    ]);
  });

  it("splits an item evenly between two assignees", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }],
      assignments: [
        { itemId: "i1", participantId: "p1", shareFraction: 0.5 },
        { itemId: "i1", participantId: "p2", shareFraction: 0.5 },
      ],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 10, tax: 1, tip: 2, total: 13 },
      { participantId: "p2", subtotal: 10, tax: 1, tip: 2, total: 13 },
    ]);
  });

  it("handles quantity > 1 by multiplying unit price", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 0,
      billTip: 0,
      items: [{ id: "i1", unitPrice: 10, quantity: 2 }],
      participants: [{ id: "p1" }],
      assignments: [{ itemId: "i1", participantId: "p1", shareFraction: 1 }],
    });
    expect(result[0].subtotal).toBe(20);
    expect(result[0].total).toBe(20);
  });

  it("handles bill subtotal of zero without dividing by zero", () => {
    const result = computePerPersonTotals({
      billSubtotal: 0,
      billTax: 2,
      billTip: 4,
      items: [],
      participants: [{ id: "p1" }],
      assignments: [],
    });
    expect(result).toEqual([
      { participantId: "p1", subtotal: 0, tax: 0, tip: 0, total: 0 },
    ]);
  });

  it("rounds totals to 2 decimal places", () => {
    const result = computePerPersonTotals({
      billSubtotal: 10,
      billTax: 1,
      billTip: 0,
      items: [{ id: "i1", unitPrice: 10, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
      assignments: [
        { itemId: "i1", participantId: "p1", shareFraction: 1 / 3 },
        { itemId: "i1", participantId: "p2", shareFraction: 1 / 3 },
        { itemId: "i1", participantId: "p3", shareFraction: 1 / 3 },
      ],
    });
    expect(result[0].subtotal).toBeCloseTo(3.33, 2);
    expect(result[0].total).toBeCloseTo(3.67, 2);
  });

  it("returns 0 for participants with no assignments even when others have them", () => {
    const result = computePerPersonTotals({
      billSubtotal: 20,
      billTax: 2,
      billTip: 4,
      items: [{ id: "i1", unitPrice: 20, quantity: 1 }],
      participants: [{ id: "p1" }, { id: "p2" }],
      assignments: [{ itemId: "i1", participantId: "p1", shareFraction: 1 }],
    });
    expect(result.find((r) => r.participantId === "p2")).toEqual({
      participantId: "p2",
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
    });
  });
});
