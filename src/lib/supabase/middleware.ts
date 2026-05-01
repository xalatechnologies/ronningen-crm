import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isAuthPath, isProtectedPath } from "@/config/routes";

import type { Database } from "@/types/database.types";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.supabase-ssr-build-placeholder";

let missingMiddlewareEnvWarned = false;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const url = envUrl && envUrl.length > 0 ? envUrl : PLACEHOLDER_URL;
  const anon = envAnon && envAnon.length > 0 ? envAnon : PLACEHOLDER_ANON;

  if (!envUrl || !envAnon) {
    if (
      !missingMiddlewareEnvWarned &&
      (isProtectedPath(request.nextUrl.pathname) ||
        isAuthPath(request.nextUrl.pathname))
    ) {
      missingMiddlewareEnvWarned = true;
      console.warn(
        "[supabase] Missing public Supabase env — auth middleware uses placeholder; set keys for real sessions",
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
