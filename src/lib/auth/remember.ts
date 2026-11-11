import "server-only";

import { cookies } from "next/headers";

import { REMEMBER_COOKIE, REMEMBER_MAX_AGE_SECONDS } from "@/lib/auth/session-lifetime";

/** Stores the «Hold meg innlogget» choice so later cookie refreshes keep the same lifetime. */
export async function setRememberCookie(remember: boolean) {
  (await cookies()).set(REMEMBER_COOKIE, remember ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {}),
  });
}
