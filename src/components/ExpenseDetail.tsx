import type { Expense, Person } from "@/types";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/id";
import { categoryMeta } from "@/lib/categories";
import { AvatarBadge } from "./AvatarBadge";

function personFor(people: Person[], id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// Shared by the desktop inline expansion and the mobile full-screen view, so
// the two can't drift apart. Presentational only — no expand/close state.
export function ExpenseDetail({ expense, people }: { expense: Expense; people: Person[] }) {
  const { label: categoryLabel, icon: CategoryIcon } = categoryMeta(expense.category);
  const payer = personFor(people, expense.paidBy);

  // Show each participant's actual share rather than just who was involved —
  // that's the number people actually want to check.
  const shares = expense.splits.length
    ? expense.splits
    : expense.participantIds.map((personId) => ({ personId, amountCents: 0 }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <span className="flex items-center gap-1.5">
            <CategoryIcon className="size-4 text-muted-foreground" />
            {categoryLabel}
          </span>
        </Field>
        <Field label="Date">{formatDate(expense.createdAt)}</Field>
        <Field label="Paid by">
          <span className="flex items-center gap-1.5">
            <AvatarBadge
              id={expense.paidBy}
              name={payer?.name ?? "Unknown"}
              avatarUrl={payer?.avatarUrl}
              size="sm"
            />
            {payer?.name ?? "Unknown"}
          </span>
        </Field>
        <Field label="Split">
          {expense.splitMethod === "equal" ? "Equally" : "Exact amounts"}
        </Field>
      </div>

      {expense.note && <Field label="Note">{expense.note}</Field>}

      <Field label={`Involved (${shares.length})`}>
        <ul className="flex flex-col gap-1.5">
          {shares.map((split) => {
            const person = personFor(people, split.personId);
            return (
              <li key={split.personId} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <AvatarBadge
                    id={split.personId}
                    name={person?.name ?? "Unknown"}
                    avatarUrl={person?.avatarUrl}
                    size="sm"
                  />
                  <span className="truncate">{person?.name ?? "Unknown"}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCurrency(split.amountCents)}
                </span>
              </li>
            );
          })}
        </ul>
      </Field>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-medium">Total</span>
        <span className="text-base font-bold tabular-nums">
          {formatCurrency(expense.totalCents)}
        </span>
      </div>
    </div>
  );
}
