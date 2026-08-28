"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Expense, Person } from "@/types";
import { formatCurrency } from "@/lib/money";
import { AvatarBadge } from "./AvatarBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MembersPanel({
  people,
  expenses,
  balances,
  onRemove,
  panelPadClassName,
}: {
  people: Person[];
  expenses: Expense[];
  balances: Record<string, number>;
  onRemove: (id: string) => void;
  panelPadClassName?: string;
}) {
  const [blockedId, setBlockedId] = useState<string | null>(null);

  function referencingExpenses(personId: string): Expense[] {
    return expenses.filter((e) => e.paidBy === personId || e.participantIds.includes(personId));
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {blockedPerson && (
        <div
          className={cn(
            "shrink-0 rounded-lg border border-negative/30 bg-negative-soft p-3 text-sm text-negative",
            panelPadClassName
          )}
        >
          Can&apos;t remove <strong>{blockedPerson.name}</strong> — referenced in {blockedRefs.length}{" "}
          expense{blockedRefs.length === 1 ? "" : "s"}:{" "}
          {blockedRefs.map((e) => e.description || "Untitled").join(", ")}. Delete those expenses
          first.
        </div>
      )}

      <div className={cn("min-h-0 flex-1 overflow-y-auto pb-20 sm:pb-6", panelPadClassName)}>
        <ul className="flex flex-col gap-2">
          {people.map((person) => {
            const amount = balances[person.id] ?? 0;
            return (
              <li
                key={person.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarBadge id={person.id} name={person.name} avatarUrl={person.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    {/* A member is a "ghost" until an account is linked to it —
                        either the group creator, or someone who accepted an
                        invite and claimed this row. Only linked members have a
                        profile (and therefore an email) to show. */}
                    {person.userId ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {person.email ?? "Signed-in member"}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Ghost · no account yet</p>
                    )}
                    <p
                      className={cn(
                        "text-xs font-medium",
                        amount === 0
                          ? "text-muted-foreground"
                          : amount > 0
                            ? "text-positive"
                            : "text-negative"
                      )}
                    >
                      {amount === 0
                        ? "Settled up"
                        : amount > 0
                          ? `Owed ${formatCurrency(amount)}`
                          : `Owes ${formatCurrency(-amount)}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(person.id)}
                  aria-label={`Remove ${person.name}`}
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
          {people.length === 0 && (
            <li className="text-sm text-muted-foreground">No members yet. Add someone to get started.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
