"use client";

import type { Expense, Person } from "@/types";
import { ResponsiveDialog } from "@/components/ui-ext/ResponsiveDialog";
import { ExpenseForm } from "./ExpenseForm";

export function ExpenseFormDialog({
  open,
  onOpenChange,
  people,
  editingExpense,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  editingExpense: Expense | null;
  onSave: (expense: Expense) => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingExpense ? "Edit expense" : "Add expense"}
      contentClassName="sm:max-w-lg"
    >
      <ExpenseForm
        key={editingExpense ? editingExpense.id : open ? "new" : "closed"}
        people={people}
        editingExpense={editingExpense}
        onSave={onSave}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDialog>
  );
}
