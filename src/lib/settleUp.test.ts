import { describe, it, expect } from "vitest";
import { simplifyDebts } from "./settleUp";

describe("simplifyDebts", () => {
  it("produces the minimal 3-transaction settlement for the spec scenario", () => {
    const balances = {
      alice: 566667,
      bob: -933333,
      carol: 700000,
      dave: -333334,
    };

    const transactions = simplifyDebts(balances);

    expect(transactions).toEqual([
      { from: "bob", to: "carol", amountCents: 700000 },
      { from: "dave", to: "alice", amountCents: 333334 },
      { from: "bob", to: "alice", amountCents: 233333 },
    ]);

    const paidByPerson: Record<string, number> = {};
    const receivedByPerson: Record<string, number> = {};
    for (const t of transactions) {
      paidByPerson[t.from] = (paidByPerson[t.from] ?? 0) + t.amountCents;
      receivedByPerson[t.to] = (receivedByPerson[t.to] ?? 0) + t.amountCents;
    }

    expect(paidByPerson.bob).toBe(933333);
    expect(paidByPerson.dave).toBe(333334);
    expect(receivedByPerson.alice).toBe(566667);
    expect(receivedByPerson.carol).toBe(700000);
  });

  it("returns no transactions when everyone is already settled", () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });

  it("handles a simple two-person debt", () => {
    expect(simplifyDebts({ a: 500, b: -500 })).toEqual([
      { from: "b", to: "a", amountCents: 500 },
    ]);
  });
});
