"use client";

import { useState } from "react";
import type { Expense, Person, SplitMethod } from "@/types";
import { formatCurrency, splitEqually, sumSplits, toCents } from "@/lib/money";
import { generateId, timestampNow, toDateInputValue, combineDateAndTime } from "@/lib/id";
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

function initialOrder(people: Person[], editingExpense: Expense | null): string[] {
  const base = editingExpense?.participantIds ?? people.map((p) => p.id);
  const rest = people.map((p) => p.id).filter((id) => !base.includes(id));
  return [...base, ...rest];
}

const GripIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="currentColor"
    aria-hidden="true"
    className="flex-shrink-0 text-text-muted"
  >
    <circle cx="5" cy="3" r="1.3" />
    <circle cx="11" cy="3" r="1.3" />
    <circle cx="5" cy="8" r="1.3" />
    <circle cx="11" cy="8" r="1.3" />
    <circle cx="5" cy="13" r="1.3" />
    <circle cx="11" cy="13" r="1.3" />
  </svg>
);

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
  // Captured once on mount: source of truth for the time-of-day portion of
  // createdAt, so picking a date doesn't collapse same-day entries to midnight.
  const [referenceTime] = useState(() => editingExpense?.createdAt ?? timestampNow());
  const [dateStr, setDateStr] = useState(() => toDateInputValue(referenceTime));
  // `order` controls display order for every member, checked or not. Splits
  // (equal or exact) are computed in this order, so dragging a row also
  // decides who gets the leftover cent(s) on an uneven equal split.
  const [order, setOrder] = useState<string[]>(() => initialOrder(people, editingExpense));
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(editingExpense?.participantIds ?? people.map((p) => p.id))
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    editingExpense?.splitMethod ?? "equal"
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    initialExactAmounts(editingExpense)
  );

  const participantIds = order.filter((id) => selected.has(id));
  const totalCents = toCents(parseFloat(amountRs) || 0);

  function toggleParticipant(personId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  function handleDrop(targetIndex: number) {
    setOrder((prev) => {
      if (dragIndex === null || dragIndex === targetIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
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
      createdAt: combineDateAndTime(dateStr, referenceTime),
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
    "w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-base outline-none focus:border-accent";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner, Uber, Groceries"
          className={fieldClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-text">Total Amount (LKR)</label>
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
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-text">Date</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text">Paid by</label>
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={fieldClass}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <label className="block text-sm font-semibold text-text">Split between</label>
          <span
            tabIndex={0}
            title="If the total can't be split perfectly evenly, the extra cent(s) go to the first person in this list. Drag rows by the handle to reorder."
            className="flex h-4 w-4 flex-shrink-0 cursor-help items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-text-muted"
          >
            i
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {order.map((personId, index) => {
            const p = people.find((person) => person.id === personId);
            if (!p) return null;
            return (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-base ${
                  dragIndex === index ? "opacity-40" : ""
                }`}
              >
                <span className="cursor-grab active:cursor-grabbing">
                  <GripIcon />
                </span>
                <label className="flex flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleParticipant(p.id)}
                    className="accent-accent"
                  />
                  <AvatarBadge id={p.id} name={p.name} size="sm" />
                  {p.name}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-text">Split method</label>
        <div className="flex gap-1 rounded-2xl bg-surface-muted p-1">
          {(["equal", "exact"] as SplitMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setSplitMethod(method)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                splitMethod === method
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted"
              }`}
            >
              {method === "equal" ? "Equal" : "Exact Amount"}
            </button>
          ))}
        </div>
      </div>

      {splitMethod === "equal" && participantIds.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-2xl border border-border p-4 text-sm">
          {equalPreview.map((split) => {
            const person = people.find((p) => p.id === split.personId);
            const minAmount = Math.min(...equalPreview.map((s) => s.amountCents));
            const getsExtraCent = split.amountCents > minAmount;
            return (
              <li key={split.personId} className="flex justify-between">
                <span>
                  {person?.name}
                  {getsExtraCent && (
                    <span className="ml-1.5 text-xs font-medium text-text-muted">
                      (+1¢)
                    </span>
                  )}
                </span>
                <span className="tabular-nums">{formatCurrency(split.amountCents)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {splitMethod === "exact" && participantIds.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-border p-4">
          {participantIds.map((personId) => {
            const person = people.find((p) => p.id === personId);
            return (
              <div key={personId} className="flex items-center justify-between gap-3">
                <span className="text-base">{person?.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={exactAmounts[personId] ?? ""}
                  onChange={(e) =>
                    setExactAmounts((prev) => ({ ...prev, [personId]: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-28 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-right text-sm outline-none focus:border-accent"
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
          className="rounded-2xl bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {editingExpense ? "Save changes" : "Add expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-border px-5 py-2.5 text-base font-medium hover:bg-surface-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
