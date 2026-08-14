"use client";

import type { Expense, Person, Settlement } from "@/types";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/id";
import { AvatarBadge } from "./AvatarBadge";

function nameFor(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? "Unknown";
}

type FeedItem =
  | { kind: "expense"; data: Expense }
  | { kind: "settlement"; data: Settlement };

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
  onDeleteExpense: (id: string) => void;
  onDeleteSettlement: (id: string) => void;
}) {
  const items: FeedItem[] = [
    ...expenses.map((e): FeedItem => ({ kind: "expense", data: e })),
    ...settlements.map((s): FeedItem => ({ kind: "settlement", data: s })),
  ].sort((a, b) => b.data.createdAt - a.data.createdAt);

  if (items.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border bg-surface px-5 py-10 text-center text-base text-text-muted">
        No activity yet. Log an expense or record a payment to start.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) =>
        item.kind === "expense" ? (
          <li
            key={`e-${item.data.id}`}
            className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <AvatarBadge id={item.data.paidBy} name={nameFor(people, item.data.paidBy)} />
              <div>
                <p className="text-base font-semibold text-text">
                  {item.data.description || "Untitled expense"}
                </p>
                <p className="text-sm text-text-muted">
                  {nameFor(people, item.data.paidBy)} paid {formatCurrency(item.data.totalCents)}{" "}
                  &middot;{" "}
                  {item.data.splitMethod === "equal" ? "Equal split" : "Exact split"} &middot;{" "}
                  {item.data.participantIds.length} people &middot; {formatDate(item.data.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => onEditExpense(item.data)}
                className="font-semibold text-text hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this expense?")) onDeleteExpense(item.data.id);
                }}
                className="font-semibold text-you-owe hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ) : (
          <li
            key={`s-${item.data.id}`}
            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <AvatarBadge id={item.data.fromPersonId} name={nameFor(people, item.data.fromPersonId)} />
              <div>
                <p className="text-base font-semibold text-text">
                  {nameFor(people, item.data.fromPersonId)} paid{" "}
                  {nameFor(people, item.data.toPersonId)}
                </p>
                <p className="text-sm text-owed-to-you">
                  Settled {formatCurrency(item.data.amountCents)} &middot;{" "}
                  {formatDate(item.data.createdAt)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this payment record?")) onDeleteSettlement(item.data.id);
              }}
              className="text-sm font-semibold text-you-owe hover:underline"
            >
              Delete
            </button>
          </li>
        )
      )}
    </ul>
  );
}
