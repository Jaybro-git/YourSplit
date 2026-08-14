import { describe, it, expect } from "vitest";
import { computeBalances } from "./balances";
import { splitEqually } from "./money";
import type { Person, Expense, Settlement } from "@/types";

const alice: Person = { id: "alice", name: "Alice" };
const bob: Person = { id: "bob", name: "Bob" };
const carol: Person = { id: "carol", name: "Carol" };
const dave: Person = { id: "dave", name: "Dave" };
const people = [alice, bob, carol, dave];

const expenses: Expense[] = [
  {
    id: "e1",
    description: "Trip essentials",
    totalCents: 1200000,
    paidBy: "alice",
    participantIds: ["alice", "bob", "carol", "dave"],
    splitMethod: "equal",
    splits: splitEqually(1200000, ["alice", "bob", "carol", "dave"]),
    createdAt: 1,
  },
  {
    id: "e2",
    description: "Groceries",
    totalCents: 1000000,
    paidBy: "carol",
    participantIds: ["alice", "bob", "dave"],
    splitMethod: "exact",
    splits: [
      { personId: "alice", amountCents: 333333 },
      { personId: "bob", amountCents: 333333 },
      { personId: "dave", amountCents: 333334 },
    ],
    createdAt: 2,
  },
  {
    id: "e3",
    description: "Snacks",
    totalCents: 600000,
    paidBy: "dave",
    participantIds: ["dave", "bob"],
    splitMethod: "equal",
    splits: splitEqually(600000, ["dave", "bob"]),
    createdAt: 3,
  },
];

describe("computeBalances", () => {
  it("matches the spec scenario exactly and sums to zero", () => {
    const balances = computeBalances(people, expenses);

    expect(balances.alice).toBe(566667);
    expect(balances.bob).toBe(-933333);
    expect(balances.carol).toBe(700000);
    expect(balances.dave).toBe(-333334);

    const total = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });

  it("a full settlement zeroes out the paid pair, a partial one leaves a remainder", () => {
    const fullSettlement: Settlement[] = [
      { id: "s1", fromPersonId: "bob", toPersonId: "carol", amountCents: 700000, createdAt: 4 },
    ];
    const afterFull = computeBalances(people, expenses, fullSettlement);
    expect(afterFull.bob).toBe(-233333);
    expect(afterFull.carol).toBe(0);
    expect(Object.values(afterFull).reduce((a, b) => a + b, 0)).toBe(0);

    const partialSettlement: Settlement[] = [
      { id: "s1", fromPersonId: "bob", toPersonId: "carol", amountCents: 200000, createdAt: 4 },
    ];
    const afterPartial = computeBalances(people, expenses, partialSettlement);
    expect(afterPartial.bob).toBe(-733333);
    expect(afterPartial.carol).toBe(500000);
  });
});
