"use client";

import { useMemo, useState } from "react";
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
  currentPersonId,
  onOpen,
}: {
  people: Person[];
  transaction: Transaction;
  currentPersonId: string | null;
  onOpen: () => void;
}) {
  const { bg, border } = lightCardColorForId(transaction.from);
  // Read your own rows as "You → Priya" rather than repeating your own name.
  const label = (id: string) => (id === currentPersonId ? "You" : nameFor(people, id));

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
          {label(transaction.from)} → {label(transaction.to)}
        </p>
        <p className="font-bold tabular-nums">{formatCurrency(transaction.amountCents)}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onOpen} className="ml-1 shrink-0">
        Settle
      </Button>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function SettleUpStrip({
  people,
  transactions,
  currentPersonId,
  onSettle,
}: {
  people: Person[];
  transactions: Transaction[];
  currentPersonId: string | null;
  onSettle: (transaction: Transaction, amountCents: number) => void;
}) {
  const [settling, setSettling] = useState<Transaction | null>(null);

  // Payments you're part of come first — they're the only ones you can
  // actually act on. Within yours, money you owe leads, since that's the side
  // that needs doing rather than waiting.
  const { mine, others } = useMemo(() => {
    if (!currentPersonId) return { mine: [], others: transactions };
    const involved = (t: Transaction) => t.from === currentPersonId || t.to === currentPersonId;
    return {
      mine: transactions
        .filter(involved)
        .sort((a, b) => Number(b.from === currentPersonId) - Number(a.from === currentPersonId)),
      others: transactions.filter((t) => !involved(t)),
    };
  }, [transactions, currentPersonId]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-positive-soft bg-positive-soft px-5 py-4 text-sm font-medium text-positive">
        Everyone&apos;s settled up.
      </div>
    );
  }

  // Headings only earn their space when there's actually a split to explain.
  const showHeadings = mine.length > 0 && others.length > 0;

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {showHeadings && <SectionLabel>Involving you</SectionLabel>}
        {mine.map((t) => (
          <SettleRow
            key={`${t.from}-${t.to}`}
            people={people}
            transaction={t}
            currentPersonId={currentPersonId}
            onOpen={() => setSettling(t)}
          />
        ))}

        {showHeadings && <SectionLabel>Between others</SectionLabel>}
        {others.map((t) => (
          <SettleRow
            key={`${t.from}-${t.to}`}
            people={people}
            transaction={t}
            currentPersonId={currentPersonId}
            onOpen={() => setSettling(t)}
          />
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
