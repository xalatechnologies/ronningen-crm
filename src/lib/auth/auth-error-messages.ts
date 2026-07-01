import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { TranslationKey } from "@/i18n/types";

type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Maps Supabase Auth errors to actionable user messages for the given locale.
 */
export function mapAuthErrorToUserMessage(
  error: AuthErrorLike,
  locale: Locale = "nb",
): string {
  const t = createTranslator(getDictionary(locale));
  const message = error.message?.trim() ?? "";
  const code = error.code?.trim() ?? "";
  const combined = `${code} ${message}`.toLowerCase();

  if (
    includes(combined, "email rate limit exceeded") ||
    includes(combined, "over_email_send_rate_limit")
  ) {
    return t("auth.errors.emailRateLimit");
  }

  if (
    includes(combined, "user already registered") ||
    includes(combined, "already been registered") ||
    includes(combined, "already exists")
  ) {
    return t("auth.errors.userAlreadyRegistered");
  }

  if (
    includes(combined, "invalid login credentials") ||
    includes(combined, "invalid_credentials")
  ) {
    return t("auth.errors.invalidCredentials");
  }

  if (
    includes(combined, "email address") &&
    (includes(combined, "invalid") ||
      includes(combined, "unable to validate") ||
      includes(combined, "not authorized"))
  ) {
    return t("auth.errors.invalidEmail");
  }

  if (includes(combined, "password") && includes(combined, "weak")) {
    return t("auth.errors.weakPassword");
  }

  if (
    includes(combined, "signup is disabled") ||
    includes(combined, "signups not allowed")
  ) {
    return t("auth.errors.signupDisabled");
  }

  if (includes(combined, "failed to fetch") || includes(combined, "network")) {
    return t("auth.errors.network");
  }

  if (message) {
    return message;
  }

  return t("auth.errors.generic");
}

/** @deprecated Use mapAuthErrorToUserMessage */
export function mapAuthErrorToNorwegian(error: AuthErrorLike): string {
  return mapAuthErrorToUserMessage(error, "nb");
}

export type { AuthErrorLike, TranslationKey };
