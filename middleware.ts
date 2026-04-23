import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAuthRouteProtectionEnabled, isSupabaseConfigured } from "@/lib/supabase/env";
import { getSafeInternalRedirect, isAuthPublicPath } from "@/lib/supabase/safe-redirect";

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
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAuthRouteProtectionEnabled()) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
