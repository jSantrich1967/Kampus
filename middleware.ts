import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAuthRouteProtectionEnabled, isSupabaseConfigured } from "@/lib/supabase/env";
import { getSafeInternalRedirect, isAuthPublicPath, isKnownAppPath } from "@/lib/supabase/safe-redirect";

/** Avoid Supabase round-trips for anonymous visitors to public routes (reduces Edge timeouts). */
function hasLikelySupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
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

  // Local/preview demos with auth bypass: skip Supabase on every navigation.
  if (!isAuthRouteProtectionEnabled()) {
    return NextResponse.next();
  }

  // Unknown paths: let Next.js render the branded 404 instead of bouncing to /login.
  if (!isKnownAppPath(pathname)) {
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  /** Browsers that entered through /demo can browse the app without a Supabase session. */
  const demoMode = request.cookies.get("kampus_demo")?.value === "1";

  if (!user && !demoMode && !isAuthPublicPath(pathname)) {
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
