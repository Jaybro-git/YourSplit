"use client";

import { useState } from "react";
import type { Expense, Person, SplitMethod } from "@/types";
import { formatCurrency, splitEqually, sumSplits, toCents } from "@/lib/money";
import { generateId, timestampNow } from "@/lib/id";
import { AvatarBadge } from "./AvatarBadge";

function emptyExactAmounts(participantIds: string[]): Record<string, string> {
  return Object.fromEntries(participantIds.map((id) => [id, ""]));
}

function initialExactAmounts(editingExpense: Expense | null): Record<string, string> {
  if (!editingExpense) return {};
  const amounts = emptyExactAmounts(editingExpense.participantIds);
  for (const split of editingExpense.splits) {
    amounts[split.personId] = (split.amountCents / 100).toString();
  }
  return amounts;
}

// Rendered with a `key` in GroupDetail that changes between "new" and each
// expense id, so switching targets remounts this form instead of syncing
// via an effect.
export function ExpenseForm({
  people,
  editingExpense,
  onSave,
  onCancel,
}: {
  people: Person[];
  editingExpense: Expense | null;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(editingExpense?.description ?? "");
  const [amountRs, setAmountRs] = useState(
    editingExpense ? (editingExpense.totalCents / 100).toString() : ""
  );
  const [paidBy, setPaidBy] = useState(editingExpense?.paidBy ?? people[0]?.id ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>(
    editingExpense?.participantIds ?? people.map((p) => p.id)
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    editingExpense?.splitMethod ?? "equal"
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    initialExactAmounts(editingExpense)
  );

  const totalCents = toCents(parseFloat(amountRs) || 0);

  function toggleParticipant(personId: string) {
    setParticipantIds((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  }

  const equalPreview =
    splitMethod === "equal" && participantIds.length > 0
      ? splitEqually(totalCents, participantIds)
      : [];

  const exactSplits = participantIds.map((personId) => ({
    personId,
    amountCents: toCents(parseFloat(exactAmounts[personId]) || 0),
  }));
  const exactSum = sumSplits(exactSplits);
  const exactRemaining = totalCents - exactSum;

  const canSubmit =
    paidBy !== "" &&
    participantIds.length > 0 &&
    totalCents > 0 &&
    (splitMethod === "equal" || exactRemaining === 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const splits =
      splitMethod === "equal" ? splitEqually(totalCents, participantIds) : exactSplits;

    const expense: Expense = {
      id: editingExpense?.id ?? generateId(),
      description: description.trim(),
      totalCents,
      paidBy,
      participantIds,
      splitMethod,
      splits,
      createdAt: editingExpense?.createdAt ?? timestampNow(),
    };

    onSave(expense);
  }

  if (people.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Add at least one member before logging an expense.
      </p>
    );
  }

  const fieldClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner, Uber, Groceries"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Total Amount (LKR)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amountRs}
          onChange={(e) => setAmountRs(e.target.value)}
          placeholder="0.00"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Paid by</label>
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={fieldClass}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Split between</label>
        <div className="flex flex-col gap-1.5">
          {people.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={participantIds.includes(p.id)}
                onChange={() => toggleParticipant(p.id)}
                className="accent-accent"
              />
              <AvatarBadge id={p.id} name={p.name} size="sm" />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Split method</label>
        <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
          {(["equal", "exact"] as SplitMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setSplitMethod(method)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                splitMethod === method
                  ? "bg-surface text-accent-strong shadow-sm"
                  : "text-text-muted"
              }`}
            >
              {method === "equal" ? "Equal" : "Exact Amount"}
            </button>
          ))}
        </div>
      </div>

      {splitMethod === "equal" && participantIds.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-border p-3 text-sm">
          {equalPreview.map((split) => {
            const person = people.find((p) => p.id === split.personId);
            return (
              <li key={split.personId} className="flex justify-between">
                <span>{person?.name}</span>
                <span className="tabular-nums">{formatCurrency(split.amountCents)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {splitMethod === "exact" && participantIds.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          {participantIds.map((personId) => {
            const person = people.find((p) => p.id === personId);
            return (
              <div key={personId} className="flex items-center justify-between gap-3">
                <span className="text-sm">{person?.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={exactAmounts[personId] ?? ""}
                  onChange={(e) =>
                    setExactAmounts((prev) => ({ ...prev, [personId]: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-28 rounded-lg border border-border bg-surface px-2 py-1 text-right text-sm outline-none focus:border-accent"
                />
              </div>
            );
          })}
          <div
            className={`mt-1 text-right text-sm font-medium ${
              exactRemaining === 0 ? "text-owed-to-you" : "text-you-owe"
            }`}
          >
            {exactRemaining === 0
              ? "Splits match the total"
              : `Remaining: ${formatCurrency(exactRemaining)}`}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {editingExpense ? "Save changes" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
