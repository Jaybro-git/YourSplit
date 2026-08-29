import type { Expense, ExpenseSplit, Group, Person, Settlement, SplitMethod } from "@/types";
import { DEFAULT_CATEGORY, isExpenseCategory, type ExpenseCategory } from "@/lib/categories";

// Row shapes as returned by GROUP_SELECT in src/store/groups.tsx
// (`*, group_members(*, profiles(avatar_url, email)), expenses(*), settlements(*)`).
// Kept local rather than importing Database["public"]["Tables"] directly
// because the embedded-relation shape isn't expressible in the hand-written
// database.types.ts without a lot of ceremony for one call site.
type MemberRow = {
  id: string;
  display_name: string;
  user_id: string | null;
  profiles: { avatar_url: string | null; email: string | null } | null;
};
type ExpenseRow = {
  id: string;
  description: string;
  total_cents: number;
  paid_by: string;
  participant_ids: string[];
  split_method: string;
  splits: unknown;
  created_at: string;
  category: string | null;
  note: string | null;
};
type SettlementRow = {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount_cents: number;
  created_at: string;
};
export type GroupRow = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  group_members: MemberRow[];
  expenses: ExpenseRow[];
  settlements: SettlementRow[];
};

function toPerson(row: MemberRow): Person {
  return {
    id: row.id,
    name: row.display_name,
    userId: row.user_id,
    avatarUrl: row.profiles?.avatar_url ?? null,
    email: row.profiles?.email ?? null,
  };
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    description: row.description,
    totalCents: row.total_cents,
    paidBy: row.paid_by,
    participantIds: row.participant_ids,
    splitMethod: row.split_method as SplitMethod,
    splits: row.splits as ExpenseSplit[],
    createdAt: new Date(row.created_at).getTime(),
    category: isExpenseCategory(row.category ?? "") ? (row.category as ExpenseCategory) : DEFAULT_CATEGORY,
    note: row.note,
  };
}

function toSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    fromPersonId: row.from_member_id,
    toPersonId: row.to_member_id,
    amountCents: row.amount_cents,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: new Date(row.created_at).getTime(),
    people: row.group_members.map(toPerson),
    expenses: row.expenses.map(toExpense),
    settlements: row.settlements.map(toSettlement),
  };
}
