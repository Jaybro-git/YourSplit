import { describe, it, expect } from "vitest";
import { splitEqually, sumSplits, formatCurrency, toCents } from "./money";

describe("toCents", () => {
  it("converts rupees to integer cents", () => {
    expect(toCents(120)).toBe(12000);
    expect(toCents(33.33)).toBe(3333);
  });
});

describe("formatCurrency", () => {
  it("formats cents as Rs. with 2 decimals", () => {
    expect(formatCurrency(333333)).toBe("Rs. 3,333.33");
    expect(formatCurrency(0)).toBe("Rs. 0.00");
    expect(formatCurrency(-333333)).toBe("-Rs. 3,333.33");
  });
});

describe("splitEqually", () => {
  it("distributes remainder cents to the first participants, sum matches total", () => {
    const splits = splitEqually(10000, ["a", "b", "c"]);
    expect(splits).toEqual([
      { personId: "a", amountCents: 3334 },
      { personId: "b", amountCents: 3333 },
      { personId: "c", amountCents: 3333 },
    ]);
    expect(sumSplits(splits)).toBe(10000);
  });

  it("splits evenly with no remainder", () => {
    const splits = splitEqually(1200000, ["a", "b", "c", "d"]);
    expect(splits.every((s) => s.amountCents === 300000)).toBe(true);
    expect(sumSplits(splits)).toBe(1200000);
  });

  it("handles remainder larger than 1 cent", () => {
    const splits = splitEqually(100, ["a", "b", "c", "d", "e", "f", "g"]);
    expect(sumSplits(splits)).toBe(100);
    const extraRecipients = splits.filter((s) => s.amountCents === 15).length;
    expect(extraRecipients).toBe(2);
  });
});
