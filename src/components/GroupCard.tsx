import type { Group } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { AvatarBadge } from "./AvatarBadge";

export function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  const balances = computeBalances(group.people, group.expenses);
  const pending = simplifyDebts(balances).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-display text-lg font-semibold text-text">{group.name}</h3>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">
          {group.expenses.length} {group.expenses.length === 1 ? "expense" : "expenses"}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {group.people.slice(0, 5).map((p) => (
          <AvatarBadge key={p.id} id={p.id} name={p.name} size="sm" />
        ))}
        {group.people.length === 0 && (
          <span className="text-sm text-text-muted">No members yet</span>
        )}
        {group.people.length > 5 && (
          <span className="text-xs font-medium text-text-muted">
            +{group.people.length - 5}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-text-muted">
        {pending === 0 ? "All settled up" : `${pending} payment${pending === 1 ? "" : "s"} pending`}
      </p>
    </button>
  );
}
