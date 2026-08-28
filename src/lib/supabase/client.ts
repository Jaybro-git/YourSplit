"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// One client per browser tab; safe to call repeatedly, @supabase/ssr caches
// internally per the docs, but we keep a module-level singleton too so every
// caller in this app shares one auth listener.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
