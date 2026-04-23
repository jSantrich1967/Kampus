/**
 * Internal redirect targets only (mitigate open redirects via ?next=).
 */
export function getSafeInternalRedirect(next: string | null, fallback = "/today"): string {
  if (next === null || next === undefined) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  return trimmed;
}

/** Paths reachable without a Supabase session when auth is required. */
export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname === "/register" || pathname === "/onboarding") return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}
