import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isAuthRouteProtectionEnabled, isSupabaseConfigured } from "@/lib/supabase/env";
import { getSafeInternalRedirect, isAuthPublicPath } from "@/lib/supabase/safe-redirect";

/** Avoid Supabase round-trips for anonymous visitors to public routes (reduces Edge timeouts). */
function hasLikelySupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
}

/**
 * `getUser()` hits Auth; on cold/slow networks Vercel can return MIDDLEWARE_INVOCATION_TIMEOUT.
 * After a short wait, fall back to cookie session (still no access to Postgres; route handlers enforce RLS).
 */
const AUTH_GET_USER_MS = 2800;

async function getAuthUserWithBudget(
  supabase: ReturnType<typeof createServerClient>,
): Promise<{ user: User | null }> {
  const getUserPromise = supabase.auth.getUser().then((r: Awaited<ReturnType<typeof supabase.auth.getUser>>) => ({
    kind: "user" as const,
    r,
  }));
  const timeoutPromise = new Promise<{ kind: "timeout" }>((resolve) => {
    setTimeout(() => resolve({ kind: "timeout" }), AUTH_GET_USER_MS);
  });
  const outcome = await Promise.race([getUserPromise, timeoutPromise]);
  if (outcome.kind === "user") {
    return { user: outcome.r.data.user ?? null };
  }
  const { data } = await supabase.auth.getSession();
  return { user: data.session?.user ?? null };
}

function redirectWithSessionCookies(from: NextResponse, url: URL) {
  const redirectResponse = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  // Anonymous public pages: skip Supabase entirely (major latency win on Edge).
  if (isAuthPublicPath(pathname) && !hasLikelySupabaseAuthCookie(request)) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { user } = await getAuthUserWithBudget(supabase);

  if (!isAuthRouteProtectionEnabled()) {
    return response;
  }

  if (!user && !isAuthPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithSessionCookies(response, loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const dest = getSafeInternalRedirect(request.nextUrl.searchParams.get("next"));
    const destUrl = new URL(dest, request.url);
    return redirectWithSessionCookies(response, destUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude /api/* — handlers read cookies themselves; avoids doubling auth work on Edge.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
