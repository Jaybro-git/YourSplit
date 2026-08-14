"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { generateId, timestampNow } from "@/lib/id";
import type { Expense, Group } from "@/types";
import { GroupCard } from "@/components/GroupCard";
import { GroupDetail } from "@/components/GroupDetail";
import { NameEntryModal } from "@/components/NameEntryModal";

export default function Home() {
  const [groups, setGroups] = useLocalStorage<Group[]>("splitter:groups", []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showAddGroup, setShowAddGroup] = useState(false);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  function addGroup(name: string) {
    const group: Group = {
      id: generateId(),
      name,
      people: [],
      expenses: [],
      createdAt: timestampNow(),
    };
    setGroups((prev) => [...prev, group]);
    setSelectedGroupId(group.id);
  }

  function updateSelectedGroup(updater: (group: Group) => Group) {
    if (!selectedGroupId) return;
    setGroups((prev) =>
      prev.map((g) => (g.id === selectedGroupId ? updater(g) : g))
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

  return (
    <div className="flex flex-1 flex-col bg-bg">
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-display text-xl font-semibold text-accent-strong">Splits</h1>
        <p className="text-sm text-text-muted">
          Split group expenses and settle up &mdash; all in this browser session.
        </p>
      </header>

      <main className="flex-1 px-6 py-6">
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            onBack={() => setSelectedGroupId(null)}
            onAddMember={addMember}
            onRemoveMember={removeMember}
            onSaveExpense={saveExpense}
            onDeleteExpense={deleteExpense}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Groups
              </h2>
              <button
                type="button"
                onClick={() => setShowAddGroup(true)}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
              >
                + Add group
              </button>
            </div>

            {groups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-text-muted">
                No groups yet. Create one to start splitting expenses.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onOpen={() => setSelectedGroupId(group.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

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
