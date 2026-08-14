"use client";

import { useState } from "react";
import type { Person, Transaction } from "@/types";
import { formatCurrency } from "@/lib/money";
import { lightCardColorForId } from "@/lib/palette";
import { AvatarBadge } from "./AvatarBadge";
import { SettleUpModal } from "./SettleUpModal";

function nameFor(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? "Unknown";
}

export function SettleUpStrip({
  people,
  transactions,
  onSettle,
}: {
  people: Person[];
  transactions: Transaction[];
  onSettle: (transaction: Transaction, amountCents: number) => void;
}) {
  const [settling, setSettling] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface-muted px-6 py-5 text-base font-medium text-owed-to-you">
        Everyone&apos;s settled up.
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Settle up
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {transactions.map((t, i) => {
          const { bg, border } = lightCardColorForId(t.from);
          return (
            <div
              key={i}
              className={`flex flex-shrink-0 items-center gap-4 rounded-3xl border ${border} ${bg} px-5 py-4 shadow-sm`}
            >
              <AvatarBadge id={t.from} name={nameFor(people, t.from)} size="lg" />
              <div className="text-base leading-tight whitespace-nowrap">
                <p>
                  <strong>{nameFor(people, t.from)}</strong> pays{" "}
                  <strong>{nameFor(people, t.to)}</strong>
                </p>
                <p className="font-bold text-text tabular-nums">
                  {formatCurrency(t.amountCents)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettling(t)}
                className="ml-1 flex-shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-surface-muted"
              >
                Settle
              </button>
            </div>
          );
        })}
      </div>

      {settling && (
        <SettleUpModal
          people={people}
          transaction={settling}
          onConfirm={(amountCents) => onSettle(settling, amountCents)}
          onClose={() => setSettling(null)}
        />
      )}
    </div>
  );
}
