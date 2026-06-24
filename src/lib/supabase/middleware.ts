import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isAdminPath, isAuthPath, isProtectedPath } from "@/config/routes";
import {
  ADMIN_SUPPORT_SEEN_COOKIE,
  adminSupportSeenCookieOptions,
  isAdminSupportPath,
} from "@/lib/admin/support-nav-badge";
import { safeInternalRedirect } from "@/lib/security/safe-redirect";
import {
  getSupabasePublicEnvForClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/public-env";

import type { Database } from "@/types/database.types";

let missingMiddlewareEnvWarned = false;

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) =>
    cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const { url, key: anon } = getSupabasePublicEnvForClient();

  if (!isSupabasePublicConfigured()) {
    if (
      !missingMiddlewareEnvWarned &&
      (isProtectedPath(request.nextUrl.pathname) ||
        isAdminPath(request.nextUrl.pathname) ||
        isAuthPath(request.nextUrl.pathname))
    ) {
      missingMiddlewareEnvWarned = true;
      console.warn(
        "[supabase] Missing public Supabase env — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      );
    }
  }

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const guestAuthPage = isAuthPath(pathname) && !hasSupabaseAuthCookie(request);

  if (guestAuthPage) {
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if ((isProtectedPath(pathname) || isAdminPath(pathname)) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = safeInternalRedirect(
      request.nextUrl.searchParams.get("redirect"),
    );
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminPath(pathname) && user) {
    const { data: isPlatformAdmin, error } = await supabase.rpc(
      "is_current_user_platform_admin",
    );
    if (error || !isPlatformAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  response.headers.set("x-pathname", pathname);

  if (isAdminSupportPath(pathname)) {
    response.cookies.set(
      ADMIN_SUPPORT_SEEN_COOKIE,
      new Date().toISOString(),
      adminSupportSeenCookieOptions,
    );
  }

  return response;
}
