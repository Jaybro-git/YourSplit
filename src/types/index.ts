export type Person = {
  id: string;
  name: string;
  // Present once a real Google account is linked to this member (via invite
  // acceptance or being the group's creator); absent for "ghost" members
  // that exist as a name only. See src/store/groups.tsx.
  userId?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

export type SplitMethod = "equal" | "exact";

export type ExpenseSplit = {
  personId: string;
  amountCents: number;
};

export type Expense = {
  id: string;
  description: string;
  totalCents: number;
  paidBy: string;
  participantIds: string[];
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
  createdAt: number;
};

export type Transaction = {
  from: string;
  to: string;
  amountCents: number;
};

export type Settlement = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  amountCents: number;
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  ownerId: string;
  people: Person[];
  expenses: Expense[];
  settlements: Settlement[];
  createdAt: number;
};
