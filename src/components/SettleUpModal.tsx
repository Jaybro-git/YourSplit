"use client";

import { useState } from "react";
import type { Person, Transaction } from "@/types";
import { formatCurrency, toCents } from "@/lib/money";
import { AvatarBadge } from "./AvatarBadge";
import { Modal } from "./Modal";

function nameFor(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? "Unknown";
}

export function SettleUpModal({
  people,
  transaction,
  onConfirm,
  onClose,
}: {
  people: Person[];
  transaction: Transaction;
  onConfirm: (amountCents: number) => void;
  onClose: () => void;
}) {
  const fullAmount = transaction.amountCents;
  const [amountRs, setAmountRs] = useState((fullAmount / 100).toString());

  const amountCents = toCents(parseFloat(amountRs) || 0);
  const canSubmit = amountCents > 0 && amountCents <= fullAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(amountCents);
    onClose();
  }

  return (
    <Modal title="Record a payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-surface-muted px-4 py-5">
          <div className="flex flex-col items-center gap-1.5">
            <AvatarBadge id={transaction.from} name={nameFor(people, transaction.from)} size="lg" />
            <span className="text-sm font-medium">{nameFor(people, transaction.from)}</span>
          </div>
          <span className="text-xl text-text-muted">→</span>
          <div className="flex flex-col items-center gap-1.5">
            <AvatarBadge id={transaction.to} name={nameFor(people, transaction.to)} size="lg" />
            <span className="text-sm font-medium">{nameFor(people, transaction.to)}</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Amount (LKR)</label>
          <input
            type="number"
            min="0.01"
            max={fullAmount / 100}
            step="0.01"
            autoFocus
            value={amountRs}
            onChange={(e) => setAmountRs(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-lg font-semibold outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>Full amount owed: {formatCurrency(fullAmount)}</span>
            <button
              type="button"
              onClick={() => setAmountRs((fullAmount / 100).toString())}
              className="font-semibold text-accent-strong hover:underline"
            >
              Use full amount
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-owed-to-you px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Record payment of {amountCents > 0 ? formatCurrency(amountCents) : "..."}
        </button>
      </form>
    </Modal>
  );
}
