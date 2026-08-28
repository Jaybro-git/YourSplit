"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile(currentUser: User) {
      // Creates the profiles row on first sign-in if it's missing. The
      // auth.users trigger can't be relied on (attaching it to Supabase's
      // auth schema is privilege-dependent), and every FK into profiles —
      // groups.owner_id, group_members.user_id, group_invites.created_by —
      // breaks without it. Idempotent, so running it on each load is fine.
      await supabase.rpc("ensure_profile");

      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url")
        .eq("id", currentUser.id)
        .single();
      setProfile(
        data
          ? { id: data.id, email: data.email, displayName: data.display_name, avatarUrl: data.avatar_url }
          : null
      );
    }

    supabase.auth.getUser().then(({ data: { user: initialUser } }) => {
      setUser(initialUser);
      if (initialUser) loadProfile(initialUser);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        loadProfile(nextUser);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
