"use client";

import { useState } from "react";
import type { Expense, Person } from "@/types";
import { formatCurrency } from "@/lib/money";
import { AvatarBadge } from "./AvatarBadge";
import { Modal } from "./Modal";

export function MembersPanel({
  people,
  expenses,
  balances,
  onAdd,
  onRemove,
  onClose,
}: {
  people: Person[];
  expenses: Expense[];
  balances: Record<string, number>;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [blockedId, setBlockedId] = useState<string | null>(null);

  function referencingExpenses(personId: string): Expense[] {
    return expenses.filter(
      (e) => e.paidBy === personId || e.participantIds.includes(personId)
    );
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  function handleRemove(personId: string) {
    if (referencingExpenses(personId).length > 0) {
      setBlockedId(personId);
      return;
    }
    setBlockedId(null);
    onRemove(personId);
  }

  const blockedPerson = blockedId ? people.find((p) => p.id === blockedId) : null;
  const blockedRefs = blockedId ? referencingExpenses(blockedId) : [];

  return (
    <Modal title="Members" onClose={onClose}>
      <form onSubmit={handleAdd} className="mb-5 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a member's name"
          className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-2xl bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-strong"
        >
          +
        </button>
      </form>

      {blockedPerson && (
        <div className="mb-4 rounded-2xl border border-you-owe/30 bg-you-owe/10 p-4 text-sm text-you-owe">
          Can&apos;t remove <strong>{blockedPerson.name}</strong> — referenced in{" "}
          {blockedRefs.length} expense{blockedRefs.length === 1 ? "" : "s"}:{" "}
          {blockedRefs.map((e) => e.description || "Untitled").join(", ")}. Delete those
          expenses first.
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {people.map((person) => {
          const amount = balances[person.id] ?? 0;
          return (
            <li
              key={person.id}
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <AvatarBadge id={person.id} name={person.name} />
                <div>
                  <p className="text-base font-semibold">{person.name}</p>
                  <p
                    className={`text-sm font-medium ${
                      amount === 0
                        ? "text-text-muted"
                        : amount > 0
                        ? "text-owed-to-you"
                        : "text-you-owe"
                    }`}
                  >
                    {amount === 0
                      ? "Settled up"
                      : amount > 0
                      ? `Is owed ${formatCurrency(amount)}`
                      : `Owes ${formatCurrency(-amount)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(person.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-you-owe"
                aria-label={`Remove ${person.name}`}
              >
                ✕
              </button>
            </li>
          );
        })}
        {people.length === 0 && (
          <li className="text-sm text-text-muted">No members yet. Add someone above.</li>
        )}
      </ul>
    </Modal>
  );
}
