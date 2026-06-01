import { describe, it, expect } from "vitest";
import { buildVenmoUrl } from "./url";

describe("buildVenmoUrl", () => {
  it("builds a Venmo pay URL with handle, amount, and note", () => {
    const url = buildVenmoUrl({
      recipient: "bauerlee",
      amount: 14.2,
      note: "Coupa lunch",
    });
    expect(url).toBe(
      "https://venmo.com/bauerlee?txn=pay&amount=14.20&note=Coupa%20lunch"
    );
  });

  it("URL-encodes special characters in the note", () => {
    const url = buildVenmoUrl({
      recipient: "bauerlee",
      amount: 5,
      note: "Tressider & Coupa",
    });
    expect(url).toContain("note=Tressider%20%26%20Coupa");
  });

  it("formats amount to exactly 2 decimal places", () => {
    expect(
      buildVenmoUrl({ recipient: "bauerlee", amount: 5, note: "x" })
    ).toContain("amount=5.00");
    expect(
      buildVenmoUrl({ recipient: "bauerlee", amount: 12.5, note: "x" })
    ).toContain("amount=12.50");
    expect(
      buildVenmoUrl({ recipient: "bauerlee", amount: 12.345, note: "x" })
    ).toContain("amount=12.35");
  });

  it("strips a leading @ from the recipient handle if present", () => {
    const url = buildVenmoUrl({
      recipient: "@bauerlee",
      amount: 5,
      note: "x",
    });
    expect(url).toBe("https://venmo.com/bauerlee?txn=pay&amount=5.00&note=x");
  });

  it("URL-encodes special characters in the recipient", () => {
    const url = buildVenmoUrl({
      recipient: "user name",
      amount: 5,
      note: "x",
    });
    expect(url).toContain("https://venmo.com/user%20name?");
  });
});
