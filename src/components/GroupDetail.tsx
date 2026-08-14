"use client";

import { useMemo, useState } from "react";
import type { Expense, Group, Transaction } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { SettleUpStrip } from "./SettleUpStrip";
import { ActivityFeed } from "./ActivityFeed";
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
  onAddSettlement,
  onDeleteSettlement,
}: {
  group: Group;
  onBack: () => void;
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddSettlement: (fromPersonId: string, toPersonId: string, amountCents: number) => void;
  onDeleteSettlement: (id: string) => void;
}) {
  const [showMembers, setShowMembers] = useState(false);
  const [expenseModal, setExpenseModal] = useState<"closed" | "new" | Expense>("closed");

  const balances = useMemo(
    () => computeBalances(group.people, group.expenses, group.settlements),
    [group.people, group.expenses, group.settlements]
  );
  const transactions = useMemo(() => simplifyDebts(balances), [balances]);

  function handleSettle(transaction: Transaction, amountCents: number) {
    onAddSettlement(transaction.from, transaction.to, amountCents);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to groups"
            className="rounded-full border border-border bg-surface px-4 py-2 text-base hover:bg-surface-muted"
          >
            ← Groups
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-text">{group.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowMembers(true)}
          className="rounded-full border border-border bg-surface px-5 py-2 text-base font-medium hover:bg-surface-muted"
        >
          Members ({group.people.length})
        </button>
      </div>

      <SettleUpStrip people={group.people} transactions={transactions} onSettle={handleSettle} />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Activity
          </h2>
          <button
            type="button"
            onClick={() => setExpenseModal("new")}
            disabled={group.people.length === 0}
            className="rounded-full bg-accent px-5 py-2 text-base font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Add expense
          </button>
        </div>
        <ActivityFeed
          people={group.people}
          expenses={group.expenses}
          settlements={group.settlements}
          onEditExpense={(expense) => setExpenseModal(expense)}
          onDeleteExpense={onDeleteExpense}
          onDeleteSettlement={onDeleteSettlement}
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
