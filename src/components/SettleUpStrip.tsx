"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Person, Transaction } from "@/types";
import { formatCurrency } from "@/lib/money";
import { lightCardColorForId } from "@/lib/palette";
import { AvatarBadge } from "./AvatarBadge";
import { SettleUpModal } from "./SettleUpModal";
import { Button } from "@/components/ui/button";

function nameFor(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? "Unknown";
}

function SettleRow({
  people,
  transaction,
  onOpen,
}: {
  people: Person[];
  transaction: Transaction;
  onOpen: () => void;
}) {
  const { bg, border } = lightCardColorForId(transaction.from);
  return (
    <div
      className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <AvatarBadge id={transaction.from} name={nameFor(people, transaction.from)} size="lg" />
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      <AvatarBadge id={transaction.to} name={nameFor(people, transaction.to)} size="lg" />
      <div className="ml-1 min-w-0 flex-1 text-sm leading-tight">
        <p className="truncate font-medium">
          {nameFor(people, transaction.from)} → {nameFor(people, transaction.to)}
        </p>
        <p className="font-bold tabular-nums">{formatCurrency(transaction.amountCents)}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onOpen} className="ml-1 shrink-0">
        Settle
      </Button>
    </div>
  );
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
      <div className="rounded-2xl border border-positive-soft bg-positive-soft px-5 py-4 text-sm font-medium text-positive">
        Everyone&apos;s settled up.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {transactions.map((t, i) => (
          <SettleRow key={i} people={people} transaction={t} onOpen={() => setSettling(t)} />
        ))}
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
