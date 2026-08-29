"use client";

import { useState, type FormEvent } from "react";
import { ResponsiveDialog } from "@/components/ui-ext/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddMemberDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Add member">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-name">Name</Label>
          <Input
            id="member-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. David"
          />
        </div>
        <Button type="submit" disabled={!name.trim()}>
          Add member
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
