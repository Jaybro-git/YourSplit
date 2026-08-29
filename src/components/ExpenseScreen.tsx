"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Expense, Person } from "@/types";
import { categoryMeta } from "@/lib/categories";
import { ExpenseDetail } from "./ExpenseDetail";
import { Button } from "@/components/ui/button";

// Mobile-only full-screen view. GroupDetail renders this *instead of* the
// group header/stats/tabs, so the only chrome left is the AppShell navbar —
// the back button is the single way out, which is why it's the first thing
// in the header row.
export function ExpenseScreen({
  expense,
  people,
  onBack,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  people: Person[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { icon: CategoryIcon, label } = categoryMeta(expense.category);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 pt-6 pb-4">
        <Button variant="outline" size="icon" aria-label="Back to group" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          title={label}
        >
          <CategoryIcon className="size-4" />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">
          {expense.description || "Untitled expense"}
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ExpenseDetail expense={expense} people={people} />
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border bg-background p-3">
        <Button variant="outline" className="flex-1 gap-1.5" onClick={onEdit}>
          <Pencil className="size-4" /> Edit
        </Button>
        <Button variant="outline" className="flex-1 gap-1.5 text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>
    </div>
  );
}
