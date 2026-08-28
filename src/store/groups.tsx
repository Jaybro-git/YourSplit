"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { toGroup, type GroupRow } from "@/lib/supabase/mappers";
import { useAuth } from "@/store/auth";
import type { Expense, Group, Settlement } from "@/types";

// One round trip per (re)load: groups the user belongs to, each with its
// members (+ linked profile avatar), expenses, and settlements nested. RLS
// on every child table filters this to exactly what the caller can see, so
// there's no separate access check needed here.
const GROUP_SELECT =
  "*, group_members(*, profiles(avatar_url, email)), expenses(*), settlements(*)";

type GroupsContextValue = {
  groups: Group[];
  hydrated: boolean;
  // Refetch from Postgres on demand. Needed whenever membership changes
  // outside this provider's normal triggers (mount / user change / window
  // focus) — notably right after accepting an invite, since the client-side
  // navigation to /g/[id] doesn't remount the provider.
  refresh: () => Promise<void>;
  addGroup: (name: string) => Promise<string>;
  restoreGroup: (group: Group) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, name: string) => Promise<void>;
  removeMember: (groupId: string, personId: string) => Promise<void>;
  saveExpense: (groupId: string, expense: Expense) => Promise<void>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<void>;
  addSettlement: (
    groupId: string,
    fromPersonId: string,
    toPersonId: string,
    amountCents: number
  ) => Promise<void>;
  restoreSettlement: (groupId: string, settlement: Settlement) => Promise<void>;
  deleteSettlement: (groupId: string, settlementId: string) => Promise<void>;
};

const GroupsContext = createContext<GroupsContextValue | null>(null);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const supabase = createClient();

  // Snapshot for optimistic-mutation rollback — kept as a ref so it's always
  // current without re-subscribing effects to `groups`. Assigned in an
  // effect (not during render) since mutating a ref while rendering can
  // desync it from what was actually committed.
  const groupsRef = useRef<Group[]>(groups);
  useEffect(() => {
    groupsRef.current = groups;
  });

  const loadGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setHydrated(true);
      return;
    }
    const { data, error } = await supabase.from("groups").select(GROUP_SELECT);
    if (error) {
      toast.error("Couldn't load your groups", { description: error.message });
    } else {
      setGroups((data as unknown as GroupRow[]).map(toGroup));
    }
    setHydrated(true);
  }, [user, supabase]);

  useEffect(() => {
    // Flip back to "loading" the moment we start a fresh load (mount, or the
    // signed-in user changed) — mirrors the one-time-read pattern in
    // useLocalStorage.ts, a genuine "starting a new load" signal rather than
    // state derivable from render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(false);
    loadGroups();
  }, [loadGroups]);

  // Cheap "sync": refetch whenever the tab regains focus, so a change made
  // by another member (or another tab) shows up without needing Realtime.
  useEffect(() => {
    function onFocus() {
      loadGroups();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadGroups]);

  function rollback(snapshot: Group[], message: string, error: { message: string }) {
    setGroups(snapshot);
    toast.error(message, { description: error.message });
  }

  function updateGroupLocal(groupId: string, updater: (group: Group) => Group) {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? updater(g) : g)));
  }

  async function addGroup(name: string): Promise<string> {
    if (!user) throw new Error("Not signed in");

    // Single RPC so the group and the creator's own member row land in one
    // transaction — see create_group in supabase/migrations/0002.
    // No .single(): create_group returns a single composite (`returns
    // public.groups`, not SETOF), so PostgREST sends a bare object already.
    const { data: groupRow, error } = await supabase.rpc("create_group", {
      group_name: name,
    });
    if (error || !groupRow) {
      toast.error("Couldn't create group", { description: error?.message });
      throw error ?? new Error("create_group returned no row");
    }

    // The RPC also inserted the creator as the first (real, non-ghost) member;
    // read it back so they're immediately selectable as a payer/participant.
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("*, profiles(avatar_url, email)")
      .eq("group_id", groupRow.id);

    const newGroup: Group = {
      id: groupRow.id,
      name: groupRow.name,
      ownerId: groupRow.owner_id,
      createdAt: new Date(groupRow.created_at).getTime(),
      people: (memberRows ?? []).map((m) => ({
        id: m.id,
        name: m.display_name,
        userId: m.user_id,
        avatarUrl: m.profiles?.avatar_url ?? null,
        email: m.profiles?.email ?? null,
      })),
      expenses: [],
      settlements: [],
    };
    setGroups((prev) => [...prev, newGroup]);
    return newGroup.id;
  }

  // Best-effort re-insert of a previously-deleted group, powering the
  // "Undo" toast. Sequential, not atomic — if a later step fails (e.g. the
  // group insert succeeds but an expense insert doesn't), the group still
  // reappears but may be missing some history. Rare path (undoing a
  // delete); a full rollback would need a dedicated transactional RPC,
  // which isn't worth the complexity here.
  async function restoreGroup(group: Group) {
    if (groupsRef.current.some((g) => g.id === group.id)) return;
    setGroups((prev) => [...prev, group]);

    const { error: groupError } = await supabase
      .from("groups")
      .insert({ id: group.id, name: group.name, owner_id: group.ownerId, created_at: new Date(group.createdAt).toISOString() });
    if (groupError) {
      rollback(groupsRef.current.filter((g) => g.id !== group.id), "Couldn't restore group", groupError);
      return;
    }

    if (group.people.length > 0) {
      const { error } = await supabase.from("group_members").insert(
        group.people.map((p) => ({ id: p.id, group_id: group.id, display_name: p.name, user_id: p.userId ?? null }))
      );
      if (error) toast.error("Group restored, but members may be incomplete", { description: error.message });
    }
    if (group.expenses.length > 0) {
      const { error } = await supabase.from("expenses").insert(
        group.expenses.map((e) => ({
          id: e.id,
          group_id: group.id,
          description: e.description,
          total_cents: e.totalCents,
          paid_by: e.paidBy,
          participant_ids: e.participantIds,
          split_method: e.splitMethod,
          splits: e.splits,
          created_at: new Date(e.createdAt).toISOString(),
        }))
      );
      if (error) toast.error("Group restored, but expenses may be incomplete", { description: error.message });
    }
    if (group.settlements.length > 0) {
      const { error } = await supabase.from("settlements").insert(
        group.settlements.map((s) => ({
          id: s.id,
          group_id: group.id,
          from_member_id: s.fromPersonId,
          to_member_id: s.toPersonId,
          amount_cents: s.amountCents,
          created_at: new Date(s.createdAt).toISOString(),
        }))
      );
      if (error) toast.error("Group restored, but payments may be incomplete", { description: error.message });
    }
  }

  async function deleteGroup(id: string) {
    const snapshot = groupsRef.current;
    setGroups((prev) => prev.filter((g) => g.id !== id));
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) rollback(snapshot, "Couldn't delete group", error);
  }

  async function addMember(groupId: string, name: string) {
    const snapshot = groupsRef.current;
    const { data, error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, display_name: name })
      .select()
      .single();
    if (error || !data) {
      rollback(snapshot, "Couldn't add member", error ?? { message: "Unknown error" });
      return;
    }
    updateGroupLocal(groupId, (g) => ({
      ...g,
      people: [...g.people, { id: data.id, name: data.display_name, userId: data.user_id }],
    }));
  }

  async function removeMember(groupId: string, personId: string) {
    const snapshot = groupsRef.current;
    updateGroupLocal(groupId, (g) => ({ ...g, people: g.people.filter((p) => p.id !== personId) }));
    const { error } = await supabase.from("group_members").delete().eq("id", personId);
    if (error) {
      // Most common cause: the member is still referenced by an expense or
      // settlement (ON DELETE RESTRICT) — surface that plainly.
      const isReferenced = error.message.toLowerCase().includes("foreign key");
      rollback(snapshot, isReferenced ? "Can't remove: they're on an expense or payment" : "Couldn't remove member", error);
    }
  }

  async function saveExpense(groupId: string, expense: Expense) {
    const snapshot = groupsRef.current;
    const wasExisting = snapshot.find((g) => g.id === groupId)?.expenses.some((e) => e.id === expense.id) ?? false;
    updateGroupLocal(groupId, (g) => ({
      ...g,
      expenses: wasExisting
        ? g.expenses.map((e) => (e.id === expense.id ? expense : e))
        : [...g.expenses, expense],
    }));

    const { error } = await supabase.from("expenses").upsert({
      id: expense.id,
      group_id: groupId,
      description: expense.description,
      total_cents: expense.totalCents,
      paid_by: expense.paidBy,
      participant_ids: expense.participantIds,
      split_method: expense.splitMethod,
      splits: expense.splits,
      created_at: new Date(expense.createdAt).toISOString(),
    });
    if (error) rollback(snapshot, "Couldn't save expense", error);
  }

  async function deleteExpense(groupId: string, expenseId: string) {
    const snapshot = groupsRef.current;
    updateGroupLocal(groupId, (g) => ({ ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) }));
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) rollback(snapshot, "Couldn't delete expense", error);
  }

  async function addSettlement(groupId: string, fromPersonId: string, toPersonId: string, amountCents: number) {
    const snapshot = groupsRef.current;
    const { data, error } = await supabase
      .from("settlements")
      .insert({ group_id: groupId, from_member_id: fromPersonId, to_member_id: toPersonId, amount_cents: amountCents })
      .select()
      .single();
    if (error || !data) {
      rollback(snapshot, "Couldn't record payment", error ?? { message: "Unknown error" });
      return;
    }
    updateGroupLocal(groupId, (g) => ({
      ...g,
      settlements: [
        ...g.settlements,
        {
          id: data.id,
          fromPersonId: data.from_member_id,
          toPersonId: data.to_member_id,
          amountCents: data.amount_cents,
          createdAt: new Date(data.created_at).getTime(),
        },
      ],
    }));
  }

  async function restoreSettlement(groupId: string, settlement: Settlement) {
    const snapshot = groupsRef.current;
    if (snapshot.find((g) => g.id === groupId)?.settlements.some((s) => s.id === settlement.id)) return;
    updateGroupLocal(groupId, (g) => ({ ...g, settlements: [...g.settlements, settlement] }));
    const { error } = await supabase.from("settlements").insert({
      id: settlement.id,
      group_id: groupId,
      from_member_id: settlement.fromPersonId,
      to_member_id: settlement.toPersonId,
      amount_cents: settlement.amountCents,
      created_at: new Date(settlement.createdAt).toISOString(),
    });
    if (error) rollback(snapshot, "Couldn't restore payment", error);
  }

  async function deleteSettlement(groupId: string, settlementId: string) {
    const snapshot = groupsRef.current;
    updateGroupLocal(groupId, (g) => ({ ...g, settlements: g.settlements.filter((s) => s.id !== settlementId) }));
    const { error } = await supabase.from("settlements").delete().eq("id", settlementId);
    if (error) rollback(snapshot, "Couldn't delete payment", error);
  }

  const value: GroupsContextValue = {
    groups,
    hydrated,
    refresh: loadGroups,
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
