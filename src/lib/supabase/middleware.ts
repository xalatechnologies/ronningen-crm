import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isAuthPath, isProtectedPath } from "@/config/routes";
import {
  getSupabasePublicEnvForClient,
  isSupabasePublicConfigured,
} from "@/lib/supabase/public-env";

import type { Database } from "@/types/database.types";

let missingMiddlewareEnvWarned = false;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const { url, key: anon } = getSupabasePublicEnvForClient();

  if (!isSupabasePublicConfigured()) {
    if (
      !missingMiddlewareEnvWarned &&
      (isProtectedPath(request.nextUrl.pathname) ||
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
