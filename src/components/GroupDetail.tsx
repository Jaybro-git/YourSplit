"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";
import type { Expense, Group, Settlement, Transaction } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { GroupHeader } from "./GroupHeader";
import { BalanceOverview } from "./BalanceOverview";
import { SettleUpStrip } from "./SettleUpStrip";
import { ActivityFeed } from "./ActivityFeed";
import { ExpenseFormDialog } from "./ExpenseFormDialog";
import { AddMemberDialog } from "./AddMemberDialog";
import { MembersPanel } from "./MembersPanel";
import { GroupSummaryPrint } from "./GroupSummaryPrint";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PANEL_PAD = "px-4 sm:px-6 lg:px-8";

type PanelTab = "settle" | "activity" | "people";

export function GroupDetail({
  group,
  onDeleteGroup,
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
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onAddSettlement: (fromPersonId: string, toPersonId: string, amountCents: number) => void;
  onDeleteSettlement: (id: string) => void;
  onRestoreSettlement: (settlement: Settlement) => void;
}) {
  const [activeTab, setActiveTab] = useState<PanelTab>("settle");
  const [expenseDialog, setExpenseDialog] = useState<"closed" | "new" | Expense>("closed");
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const balances = useMemo(
    () => computeBalances(group.people, group.expenses, group.settlements),
    [group.people, group.expenses, group.settlements]
  );
  const transactions = useMemo(() => simplifyDebts(balances), [balances]);
  const settledUp = transactions.length === 0;

  function handleSettle(transaction: Transaction, amountCents: number) {
    onAddSettlement(transaction.from, transaction.to, amountCents);
  }

  function handleDeleteExpense(expense: Expense) {
    onDeleteExpense(expense.id);
    toast("Expense deleted", {
      action: { label: "Undo", onClick: () => onSaveExpense(expense) },
    });
  }

  function handleDeleteSettlement(settlement: Settlement) {
    onDeleteSettlement(settlement.id);
    toast("Payment record deleted", {
      action: { label: "Undo", onClick: () => onRestoreSettlement(settlement) },
    });
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
        <GroupHeader name={group.name} settledUp={settledUp} onDeleteGroup={onDeleteGroup} />
        <BalanceOverview expenses={group.expenses} transactions={transactions} />
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="settle">Settle up</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>
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
          <SettleUpStrip people={group.people} transactions={transactions} onSettle={handleSettle} />
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

      <GroupSummaryPrint group={group} balances={balances} transactions={transactions} />
    </Tabs>
  );
}
