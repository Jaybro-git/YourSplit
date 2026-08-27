"use client";

import { useState } from "react";
import type { Group, Person, Transaction } from "@/types";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/id";

function nameFor(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.name ?? "Unknown";
}

// Export PDF always renders light regardless of the active theme — the
// print @media block in globals.css re-pins the token values, so the
// `text-muted-foreground` / `border-border` classes below resolve to the
// same light values whether the on-screen app is in light or dark mode.
export function GroupSummaryPrint({
  group,
  balances,
  transactions,
}: {
  group: Group;
  balances: Record<string, number>;
  transactions: Transaction[];
}) {
  const activity = [
    ...group.expenses.map((e) => ({ kind: "expense" as const, data: e })),
    ...group.settlements.map((s) => ({ kind: "settlement" as const, data: s })),
  ].sort((a, b) => a.data.createdAt - b.data.createdAt);

  // Captured once rather than read at render time — Date.now() is an impure
  // call and shouldn't run directly in a component body.
  const [generatedAt] = useState(() => Date.now());

  return (
    <div className="hidden print:block">
      <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Summary generated {formatDate(generatedAt)}
      </p>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide">Members</h2>
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-1">Name</th>
            <th className="py-1 text-right">Net balance</th>
          </tr>
        </thead>
        <tbody>
          {group.people.map((p) => {
            const cents = balances[p.id] ?? 0;
            return (
              <tr key={p.id} className="border-b border-border">
                <td className="py-1">{p.name}</td>
                <td className="py-1 text-right">
                  {cents === 0
                    ? "settled"
                    : cents > 0
                      ? `gets back ${formatCurrency(cents)}`
                      : `owes ${formatCurrency(-cents)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide">Final settlements</h2>
      {transactions.length === 0 ? (
        <p className="mt-2 text-sm">Everyone is settled up.</p>
      ) : (
        <ul className="mt-2 text-sm">
          {transactions.map((t, i) => (
            <li key={i} className="py-1">
              {nameFor(group.people, t.from)} pays {nameFor(group.people, t.to)}{" "}
              {formatCurrency(t.amountCents)}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-base font-semibold uppercase tracking-wide">All transactions</h2>
      {activity.length === 0 ? (
        <p className="mt-2 text-sm">No activity recorded.</p>
      ) : (
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-1">Date</th>
              <th className="py-1">Detail</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((item) =>
              item.kind === "expense" ? (
                <tr key={`e-${item.data.id}`} className="border-b border-border">
                  <td className="py-1 align-top">{formatDate(item.data.createdAt)}</td>
                  <td className="py-1 align-top">
                    {item.data.description || "Untitled expense"} &mdash;{" "}
                    {nameFor(group.people, item.data.paidBy)} paid,{" "}
                    {item.data.participantIds.length} people,{" "}
                    {item.data.splitMethod === "equal" ? "equal split" : "exact split"}
                  </td>
                  <td className="py-1 text-right align-top">{formatCurrency(item.data.totalCents)}</td>
                </tr>
              ) : (
                <tr key={`s-${item.data.id}`} className="border-b border-border">
                  <td className="py-1 align-top">{formatDate(item.data.createdAt)}</td>
                  <td className="py-1 align-top">
                    {nameFor(group.people, item.data.fromPersonId)} paid{" "}
                    {nameFor(group.people, item.data.toPersonId)} (settlement)
                  </td>
                  <td className="py-1 text-right align-top">{formatCurrency(item.data.amountCents)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
