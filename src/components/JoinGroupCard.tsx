"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGroups } from "@/store/groups";
import { AvatarBadge } from "@/components/AvatarBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Ghost = { id: string; display_name: string };
type Step = "confirm" | "claim" | "joining";

export function JoinGroupCard({
  token,
  groupId,
  groupName,
  memberCount,
}: {
  token: string;
  groupId: string;
  groupName: string;
  memberCount: number;
}) {
  const router = useRouter();
  const { refresh } = useGroups();
  const [step, setStep] = useState<Step>("confirm");
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // GroupsProvider sits in the root layout, so navigating to /g/[id] doesn't
  // remount it and its cached `groups` still predate this join — the group
  // page would look up an id that isn't in the array and render "Group not
  // found". Refetch before navigating.
  async function goToGroup() {
    await refresh();
    router.push(`/g/${groupId}`);
  }

  async function handleJoin() {
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("accept_invite", { invite_token: token });
    if (error) {
      toast.error("Couldn't join group", { description: error.message });
      setSubmitting(false);
      return;
    }

    // Offer to fold into an existing name-only member so past expenses and
    // balances carry over instead of starting from a blank slate.
    const { data: ghostRows } = await supabase
      .from("group_members")
      .select("id, display_name")
      .eq("group_id", groupId)
      .is("user_id", null);

    if (ghostRows && ghostRows.length > 0) {
      setSubmitting(false);
      setGhosts(ghostRows);
      setStep("claim");
    } else {
      await goToGroup();
    }
  }

  async function handleClaim() {
    setStep("joining");
    if (selectedGhostId) {
      const supabase = createClient();
      const { error } = await supabase.rpc("claim_ghost_member", { member_id: selectedGhostId });
      if (error) {
        toast.error("Couldn't link that member", { description: error.message });
        setStep("claim");
        return;
      }
    }
    await goToGroup();
  }

  if (step === "claim" || step === "joining") {
    return (
      <div className="flex w-full flex-col gap-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-lg font-bold tracking-tight">Which one are you?</h1>
          <p className="text-sm text-muted-foreground">
            Pick your existing name in &quot;{groupName}&quot; so your past expenses carry over.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {ghosts.map((ghost) => (
            <button
              key={ghost.id}
              type="button"
              onClick={() => setSelectedGhostId(ghost.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                selectedGhostId === ghost.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              <span className="flex items-center gap-2.5">
                <AvatarBadge id={ghost.id} name={ghost.display_name} size="sm" />
                {ghost.display_name}
              </span>
              {selectedGhostId === ghost.id && <Check className="size-4 text-primary" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedGhostId(null)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
              selectedGhostId === null ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
            )}
          >
            None of these — add me as new
          </button>
        </div>
        <Button onClick={handleClaim} disabled={step === "joining"}>
          {step === "joining" ? "Joining…" : "Continue"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Users className="size-6" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">Join &quot;{groupName}&quot;?</h1>
        <p className="text-sm text-muted-foreground">
          {memberCount} member{memberCount === 1 ? "" : "s"} already in this group.
        </p>
      </div>
      <Button onClick={handleJoin} disabled={submitting} size="lg" className="w-full">
        {submitting ? "Joining…" : "Join group"}
      </Button>
    </div>
  );
}
