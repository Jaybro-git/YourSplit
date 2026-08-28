import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JoinGroupCard } from "@/components/JoinGroupCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

// proxy.ts already redirects signed-out visitors to /login?next=/join/<token>
// before this ever renders, so by the time we get here the user is
// authenticated — this page only has to decide whether the token itself is
// still good.
export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_invite_preview", { invite_token: token });
  const preview = data?.[0];

  if (error || !preview || !preview.valid) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <EmptyState
          icon={CircleAlert}
          title="This invite is no longer valid"
          description="It may have expired, been revoked, or already reached its use limit. Ask whoever sent it for a new link."
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
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <JoinGroupCard
        token={token}
        groupId={preview.group_id!}
        groupName={preview.group_name!}
        memberCount={preview.member_count}
      />
    </div>
  );
}
