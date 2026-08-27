"use client";

import { useState } from "react";
import { Receipt, HandCoins, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Expense, Person, Settlement } from "@/types";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/id";
import { AvatarBadge } from "./AvatarBadge";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function nameFor(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? "Unknown";
}

type FeedItem = { kind: "expense"; data: Expense } | { kind: "settlement"; data: Settlement };

export function ActivityFeed({
  people,
  expenses,
  settlements,
  onEditExpense,
  onDeleteExpense,
  onDeleteSettlement,
}: {
  people: Person[];
  expenses: Expense[];
  settlements: Settlement[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onDeleteSettlement: (settlement: Settlement) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<FeedItem | null>(null);

  const items: FeedItem[] = [
    ...expenses.map((e): FeedItem => ({ kind: "expense", data: e })),
    ...settlements.map((s): FeedItem => ({ kind: "settlement", data: s })),
  ].sort((a, b) => b.data.createdAt - a.data.createdAt);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No activity yet"
        description="Log an expense or record a payment to start tracking this group's balances."
      />
    );
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "expense") onDeleteExpense(pendingDelete.data);
    else onDeleteSettlement(pendingDelete.data);
    setPendingDelete(null);
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((item) =>
          item.kind === "expense" ? (
            <li
              key={`e-${item.data.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Receipt className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {item.data.description || "Untitled expense"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {nameFor(people, item.data.paidBy)} paid {formatCurrency(item.data.totalCents)} ·{" "}
                  {item.data.splitMethod === "equal" ? "Equal split" : "Exact split"} ·{" "}
                  {item.data.participantIds.length} people · {formatDate(item.data.createdAt)}
                </p>
              </div>
              <AvatarBadge
                id={item.data.paidBy}
                name={nameFor(people, item.data.paidBy)}
                size="sm"
                className="hidden sm:flex"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Expense actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onEditExpense(item.data)}>
                    <Pencil className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(item)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ) : (
            <li
              key={`s-${item.data.id}`}
              className="flex items-center gap-3 rounded-xl border border-positive-soft bg-positive-soft/60 px-4 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive">
                <HandCoins className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {nameFor(people, item.data.fromPersonId)} paid {nameFor(people, item.data.toPersonId)}
                </p>
                <p className="truncate text-xs text-positive">
                  Settled {formatCurrency(item.data.amountCents)} · {formatDate(item.data.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete payment"
                onClick={() => setPendingDelete(item)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          )
        )}
      </ul>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "expense" ? "Delete this expense?" : "Delete this payment record?"}
            </AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
