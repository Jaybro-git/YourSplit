// The post-login `next` destination is attacker-controllable via the URL
// (/login?next=..., carried through to /auth/callback). Only ever allow a
// single-slash, same-origin absolute path so it can't be turned into an open
// redirect — "//evil.com" and "https://evil.com" both fall back to "/".
export function safeNext(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  // Backslashes are normalized to forward slashes by some browsers, so
  // "/\evil.com" can escape the origin too.
  if (next.startsWith("/\\")) return "/";
  return next;
}
