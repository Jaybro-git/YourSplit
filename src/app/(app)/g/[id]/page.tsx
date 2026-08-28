"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderX } from "lucide-react";
import { useGroups } from "@/store/groups";
import { GroupDetail } from "@/components/GroupDetail";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupPage({ params }: PageProps<"/g/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const {
    groups,
    hydrated,
    deleteGroup,
    leaveGroup,
    restoreGroup,
    addMember,
    removeMember,
    saveExpense,
    deleteExpense,
    addSettlement,
    deleteSettlement,
    restoreSettlement,
  } = useGroups();

  const group = groups.find((g) => g.id === id) ?? null;

  if (!hydrated) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          icon={FolderX}
          title="Group not found"
          description="This group doesn't exist, was deleted, or you don't have access to it."
          action={
            <Button asChild>
              <Link href="/">Back to groups</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <GroupDetail
      group={group}
      onDeleteGroup={() => {
        const deleted = group;
        deleteGroup(deleted.id);
        toast(`"${deleted.name}" deleted`, {
          action: {
            label: "Undo",
            onClick: () => {
              restoreGroup(deleted);
              router.push(`/g/${deleted.id}`);
            },
          },
        });
        router.push("/");
      }}
      onLeaveGroup={() => {
        // No undo: rejoining needs a fresh invite, so offering one would be
        // a lie. leaveGroup surfaces its own error toast on failure.
        const left = group;
        leaveGroup(left.id);
        toast(`You left "${left.name}"`);
        router.push("/");
      }}
      onAddMember={(name) => addMember(group.id, name)}
      onRemoveMember={(personId) => removeMember(group.id, personId)}
      onSaveExpense={(expense) => saveExpense(group.id, expense)}
      onDeleteExpense={(expenseId) => deleteExpense(group.id, expenseId)}
      onAddSettlement={(from, to, amount) => addSettlement(group.id, from, to, amount)}
      onDeleteSettlement={(settlementId) => deleteSettlement(group.id, settlementId)}
      onRestoreSettlement={(settlement) => restoreSettlement(group.id, settlement)}
    />
  );
}
