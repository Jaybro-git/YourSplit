"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { generateId, timestampNow } from "@/lib/id";
import type { Expense, Group, Settlement } from "@/types";

// Groups saved before `settlements` existed won't have that field; default
// it so older localStorage data doesn't crash newer code.
function normalizeGroup(group: Group): Group {
  return group.settlements ? group : { ...group, settlements: [] };
}

type GroupsContextValue = {
  groups: Group[];
  hydrated: boolean;
  addGroup: (name: string) => string;
  restoreGroup: (group: Group) => void;
  deleteGroup: (id: string) => void;
  addMember: (groupId: string, name: string) => void;
  removeMember: (groupId: string, personId: string) => void;
  saveExpense: (groupId: string, expense: Expense) => void;
  deleteExpense: (groupId: string, expenseId: string) => void;
  addSettlement: (
    groupId: string,
    fromPersonId: string,
    toPersonId: string,
    amountCents: number
  ) => void;
  restoreSettlement: (groupId: string, settlement: Settlement) => void;
  deleteSettlement: (groupId: string, settlementId: string) => void;
};

const GroupsContext = createContext<GroupsContextValue | null>(null);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [rawGroups, setGroups, hydrated] = useLocalStorage<Group[]>("splitter:groups", []);

  const groups = useMemo(() => rawGroups.map(normalizeGroup), [rawGroups]);

  function updateGroup(groupId: string, updater: (group: Group) => Group) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? updater(normalizeGroup(g)) : g)));
  }

  function addGroup(name: string): string {
    const group: Group = {
      id: generateId(),
      name,
      people: [],
      expenses: [],
      settlements: [],
      createdAt: timestampNow(),
    };
    setGroups((prev) => [...prev, group]);
    return group.id;
  }

  function restoreGroup(group: Group) {
    setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev, group]));
  }

  function deleteGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function addMember(groupId: string, name: string) {
    updateGroup(groupId, (g) => ({
      ...g,
      people: [...g.people, { id: generateId(), name }],
    }));
  }

  function removeMember(groupId: string, personId: string) {
    updateGroup(groupId, (g) => ({
      ...g,
      people: g.people.filter((p) => p.id !== personId),
    }));
  }

  function saveExpense(groupId: string, expense: Expense) {
    updateGroup(groupId, (g) => {
      const exists = g.expenses.some((e) => e.id === expense.id);
      return {
        ...g,
        expenses: exists
          ? g.expenses.map((e) => (e.id === expense.id ? expense : e))
          : [...g.expenses, expense],
      };
    });
  }

  function deleteExpense(groupId: string, expenseId: string) {
    updateGroup(groupId, (g) => ({
      ...g,
      expenses: g.expenses.filter((e) => e.id !== expenseId),
    }));
  }

  function addSettlement(
    groupId: string,
    fromPersonId: string,
    toPersonId: string,
    amountCents: number
  ) {
    updateGroup(groupId, (g) => ({
      ...g,
      settlements: [
        ...g.settlements,
        { id: generateId(), fromPersonId, toPersonId, amountCents, createdAt: timestampNow() },
      ],
    }));
  }

  function restoreSettlement(groupId: string, settlement: Settlement) {
    updateGroup(groupId, (g) =>
      g.settlements.some((s) => s.id === settlement.id)
        ? g
        : { ...g, settlements: [...g.settlements, settlement] }
    );
  }

  function deleteSettlement(groupId: string, settlementId: string) {
    updateGroup(groupId, (g) => ({
      ...g,
      settlements: g.settlements.filter((s) => s.id !== settlementId),
    }));
  }

  const value: GroupsContextValue = {
    groups,
    hydrated,
    addGroup,
    restoreGroup,
    deleteGroup,
    addMember,
    removeMember,
    saveExpense,
    deleteExpense,
    addSettlement,
    restoreSettlement,
    deleteSettlement,
  };

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups(): GroupsContextValue {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within a GroupsProvider");
  return ctx;
}
