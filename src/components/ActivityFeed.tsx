"use client";

import { useState } from "react";
import { ChevronDown, Receipt, HandCoins, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Expense, Person, Settlement } from "@/types";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/id";
import { categoryMeta } from "@/lib/categories";
import { AvatarBadge } from "./AvatarBadge";
import { EmptyState } from "./EmptyState";
import { ExpenseDetail } from "./ExpenseDetail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  openExpenseId,
  onToggleExpense,
  expandInline,
}: {
  people: Person[];
  expenses: Expense[];
  settlements: Settlement[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onDeleteSettlement: (settlement: Settlement) => void;
  // Which expense is open. Owned by GroupDetail because on mobile opening one
  // replaces the whole group view, not just this list.
  openExpenseId: string | null;
  onToggleExpense: (expenseId: string) => void;
  // Desktop expands in place; on mobile GroupDetail swaps in a full-screen
  // view instead, so this list never renders the detail itself.
  expandInline: boolean;
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
            (() => {
              const expense = item.data as Expense;
              const { icon: CategoryIcon, label: categoryLabel } = categoryMeta(expense.category);
              const expanded = expandInline && openExpenseId === expense.id;
              return (
                <li
                  key={`e-${expense.id}`}
                  className="rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      title={categoryLabel}
                    >
                      <CategoryIcon className="size-4" />
                    </span>
                    {/* Spans rather than <p>: a <button> may only contain
                        phrasing content, and this is the primary tap target
                        for opening the expense. */}
                    <button
                      type="button"
                      onClick={() => onToggleExpense(expense.id)}
                      aria-expanded={expanded}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <span className="block truncate text-sm font-semibold">
                        {expense.description || "Untitled expense"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {nameFor(people, expense.paidBy)} paid {formatCurrency(expense.totalCents)}{" "}
                        · {expense.splitMethod === "equal" ? "Equal split" : "Exact split"} ·{" "}
                        {expense.participantIds.length} people · {formatDate(expense.createdAt)}
                      </span>
                    </button>
                    <AvatarBadge
                      id={expense.paidBy}
                      name={nameFor(people, expense.paidBy)}
                      size="sm"
                      className="hidden sm:flex"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={expanded ? "Hide details" : "Show details"}
                      aria-expanded={expanded}
                      onClick={() => onToggleExpense(expense.id)}
                    >
                      <ChevronDown
                        className={cn("size-4 transition-transform", expanded && "rotate-180")}
                      />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Expense actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEditExpense(expense)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(item)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {expanded && (
                    <div className="mt-3 border-t border-border pt-3">
                      <ExpenseDetail expense={expense} people={people} />
                    </div>
                  )}
                </li>
              );
            })()
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
