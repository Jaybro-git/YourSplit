"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safeNext";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.59-5.17 3.59-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1c.95-2.84 3.6-4.95 6.73-4.95Z"
      />
    </svg>
  );
}

function LoginCard() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const authError = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setLoading(false);
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Wallet className="size-6" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">Sign in to YourSplit</h1>
        <p className="text-sm text-muted-foreground">
          Split group expenses and settle up with friends.
        </p>
      </div>

      {authError && (
        <p className="w-full rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Sign-in failed. Please try again.
        </p>
      )}

      <Button
        onClick={handleGoogleSignIn}
        disabled={loading}
        variant="outline"
        size="lg"
        className="w-full gap-2.5"
      >
        <GoogleIcon />
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Suspense>
        <LoginCard />
      </Suspense>
    </div>
  );
}
