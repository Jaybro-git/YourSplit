import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// For Server Components / Route Handlers. `cookies()` is async in Next 16.
// Writes are wrapped in try/catch: Server Components can't set cookies at
// all (only Route Handlers / Server Functions can), and calling `.set` from
// one throws — proxy.ts is what actually refreshes the session cookie on
// every request, so a no-op here is safe as long as proxy runs first.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — proxy.ts refreshes
            // the session cookie on the request/response pair instead.
          }
        },
      },
    }
  );
}
