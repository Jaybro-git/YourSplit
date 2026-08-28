import type { Expense, Transaction } from "@/types";
import { formatCurrency } from "@/lib/money";
import { StatTile } from "@/components/StatTile";

// Now that groups are account-backed, one member of the group is "you", so
// these are framed personally (what you paid / are owed / owe) rather than
// group-level. currentPersonId is the group_members row linked to the signed-in
// account; it falls back to the old group-wide tiles if that can't be resolved.
export function BalanceOverview({
  expenses,
  transactions,
  balances,
  currentPersonId,
}: {
  expenses: Expense[];
  transactions: Transaction[];
  balances: Record<string, number>;
  currentPersonId: string | null;
}) {
  const totalSpent = expenses.reduce((sum, e) => sum + e.totalCents, 0);

  if (!currentPersonId) {
    const outstanding = transactions.reduce((sum, t) => sum + t.amountCents, 0);
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Total spent" value={formatCurrency(totalSpent)} />
        <StatTile
          label="Outstanding"
          value={formatCurrency(outstanding)}
          tone={outstanding > 0 ? "negative" : "positive"}
        />
        <StatTile label="Transfers needed" value={String(transactions.length)} />
      </div>
    );
  }

  // What you actually paid out of pocket, not your share of it.
  const youPaid = expenses
    .filter((e) => e.paidBy === currentPersonId)
    .reduce((sum, e) => sum + e.totalCents, 0);

  // A positive balance means the group owes you; negative means you owe it.
  const balance = balances[currentPersonId] ?? 0;
  const youAreOwed = balance > 0 ? balance : 0;
  const youOwe = balance < 0 ? -balance : 0;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      <StatTile label="You paid" value={formatCurrency(youPaid)} />
      <StatTile
        label="You're owed"
        value={formatCurrency(youAreOwed)}
        tone={youAreOwed > 0 ? "positive" : "neutral"}
      />
      <StatTile
        label="You owe"
        value={formatCurrency(youOwe)}
        tone={youOwe > 0 ? "negative" : "neutral"}
      />
      <StatTile label="Group total" value={formatCurrency(totalSpent)} />
    </div>
  );
}
