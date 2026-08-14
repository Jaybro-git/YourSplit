import type { Person, Expense, Settlement } from "@/types";

export function computeBalances(
  people: Person[],
  expenses: Expense[],
  settlements: Settlement[] = []
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const person of people) {
    balances[person.id] = 0;
  }

  for (const expense of expenses) {
    if (balances[expense.paidBy] === undefined) balances[expense.paidBy] = 0;
    balances[expense.paidBy] += expense.totalCents;

    for (const split of expense.splits) {
      if (balances[split.personId] === undefined) balances[split.personId] = 0;
      balances[split.personId] -= split.amountCents;
    }
  }

  // A settlement is a real payment from one person to another: it moves both
  // balances toward zero, mirroring how an expense payer/participant pair works.
  for (const settlement of settlements) {
    if (balances[settlement.fromPersonId] === undefined) balances[settlement.fromPersonId] = 0;
    if (balances[settlement.toPersonId] === undefined) balances[settlement.toPersonId] = 0;
    balances[settlement.fromPersonId] += settlement.amountCents;
    balances[settlement.toPersonId] -= settlement.amountCents;
  }

  return balances;
}
