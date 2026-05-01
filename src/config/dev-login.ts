import type { LoginInput } from "@/lib/validations";

/**
 * Default local test account (sign-in form prefill in development only).
 * Create this user in Supabase: Authentication → Users → Add user → email + password.
 */
export const DEV_TEST_EMAIL = "admin@ronningen.no";
export const DEV_TEST_PASSWORD = "Admin1234@";

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
