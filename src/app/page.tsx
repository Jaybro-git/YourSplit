"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { generateId, timestampNow } from "@/lib/id";
import type { Expense, Group } from "@/types";
import { GroupCard } from "@/components/GroupCard";
import { GroupDetail } from "@/components/GroupDetail";
import { NameEntryModal } from "@/components/NameEntryModal";

// Groups saved before `settlements` existed won't have that field; default
// it so older localStorage data doesn't crash newer code.
function normalizeGroup(group: Group): Group {
  return group.settlements ? group : { ...group, settlements: [] };
}

export default function Home() {
  const [rawGroups, setGroups] = useLocalStorage<Group[]>("splitter:groups", []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showAddGroup, setShowAddGroup] = useState(false);

  const groups = rawGroups.map(normalizeGroup);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  function addGroup(name: string) {
    const group: Group = {
      id: generateId(),
      name,
      people: [],
      expenses: [],
      settlements: [],
      createdAt: timestampNow(),
    };
    setGroups((prev) => [...prev, group]);
    setSelectedGroupId(group.id);
  }

  function deleteGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function updateSelectedGroup(updater: (group: Group) => Group) {
    if (!selectedGroupId) return;
    setGroups((prev) =>
      prev.map((g) => (g.id === selectedGroupId ? updater(normalizeGroup(g)) : g))
    );
  }

  function addMember(name: string) {
    updateSelectedGroup((g) => ({
      ...g,
      people: [...g.people, { id: generateId(), name }],
    }));
  }

  function removeMember(id: string) {
    updateSelectedGroup((g) => ({
      ...g,
      people: g.people.filter((p) => p.id !== id),
    }));
  }

  function saveExpense(expense: Expense) {
    updateSelectedGroup((g) => {
      const exists = g.expenses.some((e) => e.id === expense.id);
      return {
        ...g,
        expenses: exists
          ? g.expenses.map((e) => (e.id === expense.id ? expense : e))
          : [...g.expenses, expense],
      };
    });
  }

  function deleteExpense(id: string) {
    updateSelectedGroup((g) => ({
      ...g,
      expenses: g.expenses.filter((e) => e.id !== id),
    }));
  }

  function addSettlement(fromPersonId: string, toPersonId: string, amountCents: number) {
    updateSelectedGroup((g) => ({
      ...g,
      settlements: [
        ...g.settlements,
        { id: generateId(), fromPersonId, toPersonId, amountCents, createdAt: timestampNow() },
      ],
    }));
  }

  function deleteSettlement(id: string) {
    updateSelectedGroup((g) => ({
      ...g,
      settlements: g.settlements.filter((s) => s.id !== id),
    }));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-outer p-4 md:p-8 print:block print:min-h-0 print:bg-white print:p-0">
      <div className="flex min-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] border border-border bg-surface shadow-2xl print:min-h-0 print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-border px-8 py-6 md:px-10 print:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-accent-strong">Your Split</h1>
          <p className="mt-1 text-base text-text-muted">
            Split group expenses and settle up.
          </p>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg px-8 py-8 md:px-10 print:overflow-visible print:h-auto print:bg-white print:p-0">
          {selectedGroup ? (
            <GroupDetail
              group={selectedGroup}
              onBack={() => setSelectedGroupId(null)}
              onAddMember={addMember}
              onRemoveMember={removeMember}
              onSaveExpense={saveExpense}
              onDeleteExpense={deleteExpense}
              onAddSettlement={addSettlement}
              onDeleteSettlement={deleteSettlement}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Groups
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddGroup(true)}
                  className="rounded-full bg-accent px-5 py-2 text-base font-semibold text-white hover:bg-accent-strong"
                >
                  + Add group
                </button>
              </div>

              {groups.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-border bg-surface px-5 py-12 text-center text-base text-text-muted">
                  No groups yet. Create one to start splitting expenses.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onOpen={() => setSelectedGroupId(group.id)}
                      onDelete={() => deleteGroup(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showAddGroup && (
        <NameEntryModal
          title="New group"
          placeholder="e.g. Goa Trip, Flatmates"
          submitLabel="Create group"
          onSubmit={addGroup}
          onClose={() => setShowAddGroup(false)}
        />
      )}
    </div>
  );
}
