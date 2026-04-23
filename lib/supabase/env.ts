/**
 * Public Supabase configuration (safe to use in the browser via NEXT_PUBLIC_*).
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

/**
 * When Supabase is configured, middleware redirects anonymous users to /login
 * unless NEXT_PUBLIC_REQUIRE_AUTH is set to "false" (previews, demos, gradual rollout).
 * Session refresh in middleware still runs whenever keys exist.
 */
export function isAuthRouteProtectionEnabled(): boolean {
  if (!isSupabaseConfigured()) return false;
  const raw = process.env.NEXT_PUBLIC_REQUIRE_AUTH?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}

/**
 * Banner in Settings when auth middleware is bypassed: only in development,
 * or when NEXT_PUBLIC_SHOW_AUTH_BYPASS_WARNING is set (e.g. preview builds).
 */
export function shouldShowAuthBypassWarning(): boolean {
  if (!isSupabaseConfigured() || isAuthRouteProtectionEnabled()) return false;
  if (process.env.NODE_ENV === "development") return true;
  const raw = process.env.NEXT_PUBLIC_SHOW_AUTH_BYPASS_WARNING?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example into .env.local and add your project keys.",
    );
  }
  return { url, anonKey };
}
