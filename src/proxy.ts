import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16 renamed `middleware.ts` to `proxy.ts` (same file convention,
// see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
//
// MUST live at `src/proxy.ts`, i.e. as a sibling of `app/` — this project uses
// a `src/` directory, and a repo-root `proxy.ts` is silently ignored (no
// warning, no build error; every protected route just serves as if signed in).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and the auth callback route
    // (which must run unauthenticated) — everything else gets a session
    // refresh + the signed-out redirect.
    "/((?!_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
