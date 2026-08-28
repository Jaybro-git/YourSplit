"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, MoreHorizontal, Trash2 } from "lucide-react";
import type { Group } from "@/types";
import { computeBalances } from "@/lib/balances";
import { simplifyDebts } from "@/lib/settleUp";
import { lightCardColorForId } from "@/lib/palette";
import { useAuth } from "@/store/auth";
import { AvatarBadge } from "./AvatarBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function GroupCard({
  group,
  onDelete,
  onLeave,
}: {
  group: Group;
  onDelete: () => void;
  onLeave: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const { user } = useAuth();
  const balances = computeBalances(group.people, group.expenses, group.settlements);
  const pending = simplifyDebts(balances).length;
  const settledUp = pending === 0;
  const { bg, border } = lightCardColorForId(group.id);

  // Mirrors GroupDetail: only the owner may delete (that's what the RLS
  // delete policy allows), and leaving needs your own balance clear.
  const isOwner = user?.id === group.ownerId;
  const currentPersonId = group.people.find((p) => p.userId && p.userId === user?.id)?.id ?? null;
  const canLeave = currentPersonId !== null && (balances[currentPersonId] ?? 0) === 0;

  return (
    <div
      className="group relative flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <Link
        href={`/g/${group.id}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${group.name}`}
      />

      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
          {group.name}
        </h3>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
            {group.expenses.length} {group.expenses.length === 1 ? "expense" : "expenses"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Group actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canLeave} onSelect={() => setLeaveOpen(true)}>
                <LogOut className="size-4" /> Leave group
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!settledUp}
                  onSelect={() => setConfirmOpen(true)}
                >
                  <Trash2 className="size-4" /> Delete group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center -space-x-2">
        {group.people.slice(0, 5).map((p) => (
          <AvatarBadge key={p.id} id={p.id} name={p.name} avatarUrl={p.avatarUrl} size="sm" className="ring-2 ring-background" />
        ))}
        {group.people.length === 0 && (
          <span className="text-sm text-muted-foreground">No members yet</span>
        )}
        {group.people.length > 5 && (
          <span className="ml-3 text-xs font-semibold text-muted-foreground">
            +{group.people.length - 5}
          </span>
        )}
      </div>

      <Badge variant={settledUp ? "outline" : "secondary"} className="w-fit">
        {settledUp ? "All settled up" : `${pending} payment${pending === 1 ? "" : "s"} pending`}
      </Badge>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{group.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. All members, expenses, and settlement history in this
              group will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave &quot;{group.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              The group stays active for everyone else, and any expenses you were part of are
              kept so their balances still add up — your name remains on them. You&apos;ll need a
              new invite link to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLeave}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
