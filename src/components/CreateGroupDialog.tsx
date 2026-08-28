"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGroups } from "@/store/groups";
import { ResponsiveDialog } from "@/components/ui-ext/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addGroup } = useGroups();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const id = await addGroup(trimmed);
      toast.success(`"${trimmed}" created`);
      setName("");
      onOpenChange(false);
      router.push(`/g/${id}`);
    } catch {
      // addGroup already surfaces a toast.error on failure.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New group"
      description="Give your group a name — you can add people once it's created."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-name">Group name</Label>
          <Input
            id="group-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip, Flatmates"
          />
        </div>
        <Button type="submit" disabled={!name.trim() || submitting}>
          {submitting ? "Creating…" : "Create group"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
