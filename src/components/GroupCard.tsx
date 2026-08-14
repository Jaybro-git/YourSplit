import type { Group } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { lightCardColorForId } from "@/lib/palette";
import { AvatarBadge } from "./AvatarBadge";

export function GroupCard({
  group,
  onOpen,
  onDelete,
}: {
  group: Group;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const balances = computeBalances(group.people, group.expenses, group.settlements);
  const pending = simplifyDebts(balances).length;
  const settledUp = pending === 0;
  const { bg, border } = lightCardColorForId(group.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={`flex cursor-pointer flex-col gap-5 rounded-3xl border ${border} ${bg} p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-text">{group.name}</h3>
        <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">
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
          <span className="text-xs font-semibold text-text-muted">
            +{group.people.length - 5}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">
          {settledUp ? "All settled up" : `${pending} payment${pending === 1 ? "" : "s"} pending`}
        </p>
        {settledUp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${group.name}"? This can't be undone.`)) onDelete();
            }}
            className="text-sm font-semibold text-you-owe hover:underline"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
