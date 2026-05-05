/**
 * Internal redirect targets only (mitigate open redirects via ?next=).
 * In production, only known app path prefixes are accepted unless NEXT_PUBLIC_REDIRECT_STRICT=false.
 */

/** First URL segment after "/", normalized (empty string means "/"). */
const ALLOWED_FIRST_SEGMENTS = new Set([
  "",
  "today",
  "study",
  "exams",
  "risk",
  "rescue",
  "institution",
  "community",
  "collaborate",
  "wellbeing",
  "teaching",
  "pass-mode",
  "settings",
  "login",
  "register",
  "onboarding",
  "auth",
]);

function isRedirectStrictEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_REDIRECT_STRICT?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  return process.env.NODE_ENV === "production";
}

function pathOnly(raw: string): string {
  const noQuery = raw.split("?")[0] ?? raw;
  const noHash = noQuery.split("#")[0] ?? noQuery;
  return noHash;
}

function firstSegment(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] ?? "";
}

export function getSafeInternalRedirect(next: string | null, fallback = "/today"): string {
  if (next === null || next === undefined) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;

  let pathnameOnly = pathOnly(trimmed);
  try {
    pathnameOnly = decodeURIComponent(pathnameOnly);
  } catch {
    return fallback;
  }

  if (!pathnameOnly.startsWith("/") || pathnameOnly.startsWith("//")) return fallback;
  if (pathnameOnly.includes("://") || pathnameOnly.includes("\\")) return fallback;
  if (pathnameOnly.includes("..")) return fallback;
  if (pathnameOnly.toLowerCase().startsWith("/api")) return fallback;

  if (isRedirectStrictEnabled()) {
    const seg = firstSegment(pathnameOnly);
    if (!ALLOWED_FIRST_SEGMENTS.has(seg)) return fallback;
  }

  return trimmed;
}

/**
 * Paths reachable without a Supabase session when auth protection is on.
 * Keep this list minimal to reduce anonymous surface area.
 */
export function isAuthPublicPath(pathname: string): boolean {
  // Landing page: allow organic visitors to understand the product before logging in.
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname === "/register") return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}
