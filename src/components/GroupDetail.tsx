"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, UserPlus } from "lucide-react";
import type { Expense, Group, Settlement, Transaction } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/store/auth";
import { ExpenseScreen } from "./ExpenseScreen";
import { GroupHeader } from "./GroupHeader";
import { BalanceOverview } from "./BalanceOverview";
import { SettleUpStrip } from "./SettleUpStrip";
import { ActivityFeed } from "./ActivityFeed";
import { ExpenseFormDialog } from "./ExpenseFormDialog";
import { AddMemberDialog } from "./AddMemberDialog";
import { InviteDialog } from "./InviteDialog";
import { MembersPanel } from "./MembersPanel";
import { GroupSummaryPrint } from "./GroupSummaryPrint";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PANEL_PAD = "px-4 sm:px-6 lg:px-8";

type PanelTab = "settle" | "activity" | "people";

export function GroupDetail({
  group,
  onDeleteGroup,
  onLeaveGroup,
  onAddMember,
  onRemoveMember,
  onSaveExpense,
  onDeleteExpense,
  onAddSettlement,
  onDeleteSettlement,
  onRestoreSettlement,
}: {
  group: Group;
  onDeleteGroup: () => void;
  onLeaveGroup: () => void;
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddSettlement: (fromPersonId: string, toPersonId: string, amountCents: number) => void;
  onDeleteSettlement: (id: string) => void;
  onRestoreSettlement: (settlement: Settlement) => void;
}) {
  const { user } = useAuth();
  const isOwner = user?.id === group.ownerId;
  // The group_members row linked to the signed-in account — "you" within this
  // group. Everything else keys off member ids, so this is the only place the
  // account identity has to be translated into a Person.
  const currentPersonId = useMemo(
    () => group.people.find((p) => p.userId && p.userId === user?.id)?.id ?? null,
    [group.people, user?.id]
  );
  // Persisted so the choice survives navigation and reloads.
  const [showStats, setShowStats] = useLocalStorage<boolean>("splitter:showStats", true);
  const [activeTab, setActiveTab] = useState<PanelTab>("settle");
  const [expenseDialog, setExpenseDialog] = useState<"closed" | "new" | Expense>("closed");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Desktop expands the row inside the activity list; mobile replaces this
  // whole view with a full-screen one, so the state has to live here rather
  // than inside ActivityFeed.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [openExpenseId, setOpenExpenseId] = useState<string | null>(null);

  const balances = useMemo(
    () => computeBalances(group.people, group.expenses, group.settlements),
    [group.people, group.expenses, group.settlements]
  );
  const transactions = useMemo(() => simplifyDebts(balances), [balances]);
  const settledUp = transactions.length === 0;
  // Leaving only requires *your* books to be clear, not the whole group's —
  // others can still owe each other. Deleting still needs the group settled,
  // since that destroys everyone's data.
  const canLeave = currentPersonId !== null && (balances[currentPersonId] ?? 0) === 0;

  function handleSettle(transaction: Transaction, amountCents: number) {
    onAddSettlement(transaction.from, transaction.to, amountCents);
  }

  function handleDeleteExpense(expense: Expense) {
    onDeleteExpense(expense.id);
    toast("Expense deleted", {
      action: { label: "Undo", onClick: () => onSaveExpense(expense) },
    });
  }

  const openExpense = openExpenseId
    ? (group.expenses.find((e) => e.id === openExpenseId) ?? null)
    : null;

  function handleDeleteSettlement(settlement: Settlement) {
    onDeleteSettlement(settlement.id);
    toast("Payment record deleted", {
      action: { label: "Undo", onClick: () => onRestoreSettlement(settlement) },
    });
  }

  // Mobile: an open expense takes over the entire group view — header, stats
  // and tabs all give way, leaving only the AppShell navbar above it.
  if (!isDesktop && openExpense) {
    return (
      <ExpenseScreen
        expense={openExpense}
        people={group.people}
        onBack={() => setOpenExpenseId(null)}
        // Return to the group view first: ExpenseFormDialog is rendered by
        // the main branch below, so it has nowhere to mount while this
        // full-screen view is up.
        onEdit={() => {
          setOpenExpenseId(null);
          setExpenseDialog(openExpense);
        }}
        onDelete={() => {
          setOpenExpenseId(null);
          handleDeleteExpense(openExpense);
        }}
      />
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as PanelTab)}
      className="flex h-full min-h-0 flex-col gap-0 print:block print:h-auto print:overflow-visible"
    >
      {/* Group summary stays put; only the panel switches below it. */}
      <div
        className={`flex shrink-0 flex-col gap-4 border-b border-border bg-background pt-6 pb-4 ${PANEL_PAD} print:static print:hidden`}
      >
        <GroupHeader
          name={group.name}
          settledUp={settledUp}
          isOwner={isOwner}
          canLeave={canLeave}
          onDeleteGroup={onDeleteGroup}
          onLeaveGroup={onLeaveGroup}
          onInvite={() => setInviteOpen(true)}
        />
        {showStats && (
          <BalanceOverview
            expenses={group.expenses}
            transactions={transactions}
            balances={balances}
            currentPersonId={currentPersonId}
          />
        )}
        {/* Toggle shares the tabs row rather than taking one of its own —
            vertical space above the fold is tight on mobile. */}
        <div className="flex items-center gap-2">
          <TabsList className="min-w-0 flex-1 sm:flex-none">
            <TabsTrigger value="settle">Settle up</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-muted-foreground"
            onClick={() => setShowStats((v) => !v)}
            aria-expanded={showStats}
            aria-label={showStats ? "Hide stats" : "Show stats"}
          >
            {showStats ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            <span className="hidden sm:inline">{showStats ? "Hide stats" : "Show stats"}</span>
          </Button>
        </div>
      </div>

      {/* Each panel below is its own fixed-header + scrolling-list column —
          only the list scrolls; the panel title (and its pinned action, on
          sm+) stays in view. All three follow the same shape. The primary
          action moves to a thumb-reachable sticky bar on mobile instead of
          living in the header row (see below). */}
      <TabsContent value="settle" className="mt-0 flex min-h-0 flex-1 flex-col gap-0 print:hidden">
        <div className={`shrink-0 pt-4 pb-3 ${PANEL_PAD}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Settle up
          </h2>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto pb-6 ${PANEL_PAD}`}>
          <SettleUpStrip
            people={group.people}
            transactions={transactions}
            currentPersonId={currentPersonId}
            onSettle={handleSettle}
          />
        </div>
      </TabsContent>

      <TabsContent value="activity" className="mt-0 flex min-h-0 flex-1 flex-col gap-0 print:hidden">
        <div className={`flex shrink-0 flex-wrap items-center justify-between gap-3 pt-4 pb-3 ${PANEL_PAD}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Activity
          </h2>
          <Button
            onClick={() => setExpenseDialog("new")}
            disabled={group.people.length === 0}
            className="hidden gap-1.5 sm:inline-flex"
          >
            <Plus className="size-4" /> Add expense
          </Button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto pb-20 sm:pb-6 ${PANEL_PAD}`}>
          <ActivityFeed
            people={group.people}
            expenses={group.expenses}
            settlements={group.settlements}
            onEditExpense={(expense) => setExpenseDialog(expense)}
            onDeleteExpense={handleDeleteExpense}
            onDeleteSettlement={handleDeleteSettlement}
            openExpenseId={openExpenseId}
            onToggleExpense={(id) =>
              setOpenExpenseId((current) => (current === id ? null : id))
            }
            expandInline={isDesktop}
          />
        </div>
      </TabsContent>

      <TabsContent value="people" className="mt-0 flex min-h-0 flex-1 flex-col gap-0 print:hidden">
        <div className={`flex shrink-0 flex-wrap items-center justify-between gap-3 pt-4 pb-3 ${PANEL_PAD}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            People ({group.people.length})
          </h2>
          <Button onClick={() => setAddMemberOpen(true)} className="hidden gap-1.5 sm:inline-flex">
            <UserPlus className="size-4" /> Add member
          </Button>
        </div>
        <MembersPanel
          people={group.people}
          expenses={group.expenses}
          balances={balances}
          onRemove={onRemoveMember}
          panelPadClassName={PANEL_PAD}
        />
      </TabsContent>

      {/* Mobile-only sticky primary action, thumb-reachable regardless of
          scroll position — mirrors whichever panel is active. */}
      {activeTab === "activity" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur-sm sm:hidden print:hidden">
          <Button
            onClick={() => setExpenseDialog("new")}
            disabled={group.people.length === 0}
            className="w-full gap-1.5"
            size="lg"
          >
            <Plus className="size-4" /> Add expense
          </Button>
        </div>
      )}
      {activeTab === "people" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur-sm sm:hidden print:hidden">
          <Button onClick={() => setAddMemberOpen(true)} className="w-full gap-1.5" size="lg">
            <UserPlus className="size-4" /> Add member
          </Button>
        </div>
      )}

      <ExpenseFormDialog
        open={expenseDialog !== "closed"}
        editingExpense={expenseDialog === "new" || expenseDialog === "closed" ? null : expenseDialog}
        people={group.people}
        onOpenChange={(open) => !open && setExpenseDialog("closed")}
        onSave={(expense) => {
          const isNew = expenseDialog === "new";
          onSaveExpense(expense);
          setExpenseDialog("closed");
          toast.success(isNew ? "Expense added" : "Expense updated");
        }}
      />
      <AddMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} onAdd={onAddMember} />
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} groupId={group.id} />

      <GroupSummaryPrint group={group} balances={balances} transactions={transactions} />
    </Tabs>
  );
}
