"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ResponsiveDialog } from "@/components/ui-ext/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mint the invite when the dialog opens. This has to key off the `open`
  // prop rather than ResponsiveDialog's onOpenChange: the parent opens this
  // dialog by setting open={true} directly, and Radix only fires
  // onOpenChange for changes it initiates itself (Escape, overlay click), so
  // the open path would never run.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function createInvite() {
      setLoading(true);
      setLink(null);
      setCopied(false);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        toast.error("You need to be signed in to invite people");
        return;
      }

      const { data, error } = await supabase
        .from("group_invites")
        .insert({ group_id: groupId, created_by: user.id })
        .select("token")
        .single();
      if (cancelled) return;

      setLoading(false);
      if (error || !data) {
        toast.error("Couldn't create invite link", { description: error?.message });
        return;
      }
      setLink(`${window.location.origin}/join/${data.token}`);
    }

    createInvite();
    return () => {
      cancelled = true;
    };
  }, [open, groupId]);

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context (https or localhost); on plain http
      // over a LAN address it throws, so leave the link selectable instead.
      toast.error("Couldn't copy — select the link and copy it manually");
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite to group"
      description="Anyone with this link can join — it expires in 7 days."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              value={loading ? "Creating link…" : (link ?? "")}
              placeholder="No link yet"
              onFocus={(e) => e.currentTarget.select()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleCopy} disabled={!link} size="icon" aria-label="Copy invite link">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
