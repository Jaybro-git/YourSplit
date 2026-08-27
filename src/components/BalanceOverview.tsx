import type { Expense, Transaction } from "@/types";
import { formatCurrency } from "@/lib/money";
import { StatTile } from "@/components/StatTile";

// No login/current-user concept exists in this app's data model — balances
// are per-person, not "you" vs. everyone else — so these stay group-level
// rather than framed as "you're owed / you owe".
export function BalanceOverview({
  expenses,
  transactions,
}: {
  expenses: Expense[];
  transactions: Transaction[];
}) {
  const totalSpent = expenses.reduce((sum, e) => sum + e.totalCents, 0);
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
