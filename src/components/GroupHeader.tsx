"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LogOut, MoreHorizontal, Printer, Trash2, UserPlus } from "lucide-react";
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

export function GroupHeader({
  name,
  settledUp,
  isOwner,
  canLeave,
  onDeleteGroup,
  onLeaveGroup,
  onInvite,
}: {
  name: string;
  settledUp: boolean;
  isOwner: boolean;
  canLeave: boolean;
  onDeleteGroup: () => void;
  onLeaveGroup: () => void;
  onInvite: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="icon" asChild aria-label="Back to groups">
          <Link href="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{name}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onInvite}>
          <UserPlus className="size-4" /> Invite
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="size-4" /> Export PDF
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Group actions">
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. All members, expenses, and settlement history in this
              group will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDeleteGroup}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave &quot;{name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              The group stays active for everyone else, and any expenses you were part of are
              kept so their balances still add up — your name remains on them. You&apos;ll need a
              new invite link to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLeaveGroup}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
