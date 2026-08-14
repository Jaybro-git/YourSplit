import type { Transaction } from "@/types";

type Entry = { id: string; remaining: number };

export function simplifyDebts(balances: Record<string, number>): Transaction[] {
  const creditors: Entry[] = [];
  const debtors: Entry[] = [];

  for (const [id, amount] of Object.entries(balances)) {
    if (amount > 0) creditors.push({ id, remaining: amount });
    else if (amount < 0) debtors.push({ id, remaining: -amount });
  }

  const transactions: Transaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.remaining - a.remaining);
    debtors.sort((a, b) => b.remaining - a.remaining);

    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.remaining, debtor.remaining);

    transactions.push({ from: debtor.id, to: creditor.id, amountCents: amount });

    creditor.remaining -= amount;
    debtor.remaining -= amount;

    if (creditor.remaining === 0) creditors.shift();
    if (debtor.remaining === 0) debtors.shift();
  }

  return transactions;
}
