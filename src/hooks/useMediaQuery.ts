"use client";

import { useEffect, useState } from "react";

// Starts `false` on both server and client so the initial client render
// matches SSR (no hydration mismatch), then corrects itself after mount —
// the same hydration-safe pattern used by useLocalStorage.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // One-time read of an external source (matchMedia) on mount, the same
    // hydration-safe pattern used by useLocalStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mql.matches);
    function handleChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
