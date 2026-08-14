"use client";

import { useMemo, useState } from "react";
import type { Expense, Group } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { SettleUpStrip } from "./SettleUpStrip";
import { ExpenseList } from "./ExpenseList";
import { ExpenseForm } from "./ExpenseForm";
import { MembersPanel } from "./MembersPanel";
import { Modal } from "./Modal";

export function GroupDetail({
  group,
  onBack,
  onAddMember,
  onRemoveMember,
  onSaveExpense,
  onDeleteExpense,
}: {
  group: Group;
  onBack: () => void;
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}) {
  const [showMembers, setShowMembers] = useState(false);
  const [expenseModal, setExpenseModal] = useState<"closed" | "new" | Expense>("closed");

  const balances = useMemo(
    () => computeBalances(group.people, group.expenses),
    [group.people, group.expenses]
  );
  const transactions = useMemo(() => simplifyDebts(balances), [balances]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to groups"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-muted"
          >
            ← Groups
          </button>
          <h1 className="font-display text-2xl font-semibold text-text">{group.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowMembers(true)}
          className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium hover:bg-surface-muted"
        >
          Members ({group.people.length})
        </button>
      </div>

      <SettleUpStrip people={group.people} transactions={transactions} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Expenses
          </h2>
          <button
            type="button"
            onClick={() => setExpenseModal("new")}
            disabled={group.people.length === 0}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add expense
          </button>
        </div>
        <ExpenseList
          people={group.people}
          expenses={group.expenses}
          onEdit={(expense) => setExpenseModal(expense)}
          onDelete={onDeleteExpense}
        />
      </div>

      {expenseModal !== "closed" && (
        <Modal
          title={expenseModal === "new" ? "Add expense" : "Edit expense"}
          onClose={() => setExpenseModal("closed")}
        >
          <ExpenseForm
            key={expenseModal === "new" ? "new" : expenseModal.id}
            people={group.people}
            editingExpense={expenseModal === "new" ? null : expenseModal}
            onSave={(expense) => {
              onSaveExpense(expense);
              setExpenseModal("closed");
            }}
            onCancel={() => setExpenseModal("closed")}
          />
        </Modal>
      )}

      {showMembers && (
        <MembersPanel
          people={group.people}
          expenses={group.expenses}
          balances={balances}
          onAdd={onAddMember}
          onRemove={onRemoveMember}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
