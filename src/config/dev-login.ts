import type { LoginInput } from "@/lib/validations";
import { PLATFORM_ADMIN_EMAIL } from "@/config/admin-routes";

/**
 * Default local dev prefill (sign-in form in development only).
 * Matches `npm run admin:seed` — see PLATFORM_ADMIN_PASSWORD in `.env.local`.
 */
export const DEV_TEST_EMAIL = PLATFORM_ADMIN_EMAIL;
export const DEV_TEST_PASSWORD = "Admin@eventmanager";

/** Prefill for the login form; production always returns empty fields. */
export function getDevLoginDefaultValues(): LoginInput {
  if (process.env.NODE_ENV !== "development") {
    return { email: "", password: "" };
  }
  return {
    email: process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? DEV_TEST_EMAIL,
    password: process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? DEV_TEST_PASSWORD,
  };
}
