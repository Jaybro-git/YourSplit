"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import type { Person, Transaction } from "@/types";
import { formatCurrency, toCents } from "@/lib/money";
import { AvatarBadge } from "./AvatarBadge";
import { ResponsiveDialog } from "@/components/ui-ext/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(amountCents);
    toast.success(
      `${nameFor(people, transaction.from)} paid ${nameFor(people, transaction.to)} ${formatCurrency(amountCents)}`
    );
    onClose();
  }

  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} title="Record a payment">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-4 rounded-xl bg-muted px-4 py-5">
          <div className="flex flex-col items-center gap-1.5">
            <AvatarBadge id={transaction.from} name={nameFor(people, transaction.from)} size="lg" />
            <span className="text-sm font-medium">{nameFor(people, transaction.from)}</span>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
          <div className="flex flex-col items-center gap-1.5">
            <AvatarBadge id={transaction.to} name={nameFor(people, transaction.to)} size="lg" />
            <span className="text-sm font-medium">{nameFor(people, transaction.to)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settle-amount">Amount (LKR)</Label>
          <Input
            id="settle-amount"
            type="number"
            min="0.01"
            max={fullAmount / 100}
            step="0.01"
            autoFocus
            value={amountRs}
            onChange={(e) => setAmountRs(e.target.value)}
            className="text-lg font-semibold"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Full amount owed: {formatCurrency(fullAmount)}</span>
            <button
              type="button"
              onClick={() => setAmountRs((fullAmount / 100).toString())}
              className="font-semibold text-primary hover:underline"
            >
              Use full amount
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-positive text-positive-foreground hover:bg-positive/90"
        >
          Record payment of {amountCents > 0 ? formatCurrency(amountCents) : "..."}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
