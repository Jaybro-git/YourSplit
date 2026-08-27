"use client";

import { useEffect, useState } from "react";

// First render must match the server (which never has access to
// localStorage), so we start from `initialValue` unconditionally and only
// swap in the persisted value after mount, once hydration is safely past.
// `hydrated` is surfaced so callers can distinguish "still loading" from
// "genuinely empty" (e.g. a route showing a skeleton vs. a not-found state).
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      // One-time read of an external source (localStorage) on mount, the
      // standard hydration-safe pattern — not derived/mirrored state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setValue(JSON.parse(stored) as T);
    } catch {
      // ignore malformed/unavailable storage, fall back to initialValue
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (e.g. private browsing quota) — ignore
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
