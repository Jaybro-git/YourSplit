import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

// Catches unmatched URLs app-wide, plus any `notFound()` call. Renders inside
// the root layout (providers + theme) but outside AppShell, so it's a
// self-contained centered card like /login and /join/[token].
//
// Invalid *group* and *invite* links deliberately don't land here — those have
// their own tailored copy in (app)/g/[id]/page.tsx and join/[token]/page.tsx,
// which can say "expired" or "no access" instead of a generic 404.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That link doesn't point anywhere in YourSplit. It may be mistyped, or the page may have moved."
        action={
          <Button asChild>
            <Link href="/">Back to groups</Link>
          </Button>
        }
      />
    </div>
  );
}
