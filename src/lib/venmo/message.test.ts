import { describe, it, expect } from "vitest";
import { buildShareMessage } from "./message";

describe("buildShareMessage", () => {
  it("includes participant name, bill name, amount, and Venmo URL when handle present", () => {
    const msg = buildShareMessage({
      participantName: "Alex",
      billName: "Coupa lunch",
      amount: 14.2,
      hostVenmoHandle: "bauerlee",
    });
    expect(msg).toContain("Alex");
    expect(msg).toContain("Coupa lunch");
    expect(msg).toContain("$14.20");
    expect(msg).toContain("venmo.com/bauerlee");
    expect(msg).toContain("amount=14.20");
  });

  it("omits the Venmo URL when host has no handle", () => {
    const msg = buildShareMessage({
      participantName: "Alex",
      billName: "Coupa lunch",
      amount: 14.2,
      hostVenmoHandle: null,
    });
    expect(msg).toContain("$14.20");
    expect(msg).not.toContain("venmo.com");
    expect(msg).not.toContain("Venmo me");
  });

  it("formats the amount to two decimal places", () => {
    const msg = buildShareMessage({
      participantName: "Alex",
      billName: "Test",
      amount: 5,
      hostVenmoHandle: null,
    });
    expect(msg).toContain("$5.00");
  });
});
