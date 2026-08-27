"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { useGroups } from "@/store/groups";
import { GroupCard } from "@/components/GroupCard";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsPage() {
  const { groups, hydrated, deleteGroup, restoreGroup } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Split group expenses and settle up.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" /> New group
        </Button>
      </div>

      {!hydrated ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No groups yet"
          description="Create a group to start splitting expenses with friends, roommates, or travel buddies."
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> Create your first group
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={() => {
                deleteGroup(group.id);
                toast(`"${group.name}" deleted`, {
                  action: { label: "Undo", onClick: () => restoreGroup(group) },
                });
              }}
            />
          ))}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
