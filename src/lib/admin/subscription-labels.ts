import type { Translator } from "@/i18n/types";
import type { TranslationKey } from "@/i18n/types";

function subscriptionStatusKey(status: string): TranslationKey | null {
  const map: Record<string, TranslationKey> = {
    active: "subscriptions.status.active",
    trialing: "subscriptions.status.trialing",
    past_due: "subscriptions.status.pastDue",
    canceled: "subscriptions.status.canceled",
    incomplete: "subscriptions.status.incomplete",
  };
  return map[status] ?? null;
}

export function subscriptionStatusLabel(status: string, t: Translator): string {
  const key = subscriptionStatusKey(status);
  return key ? t(key) : status;
}

export function subscriptionPlanLabel(plan: string, t: Translator): string {
  const key = `subscriptions.plan.${plan}` as TranslationKey;
  const value = t(key);
  return value === key ? plan : value;
}

const ACCESS_KEYS: Record<string, TranslationKey> = {
  full: "subscriptions.access.full",
  warning: "subscriptions.access.warning",
  billing_only: "subscriptions.access.billingOnly",
  suspended: "subscriptions.access.suspended",
};

export function tenantAccessLabel(access: string, t: Translator): string {
  const key = ACCESS_KEYS[access];
  return key ? t(key) : access;
}

/** @deprecated Use subscriptionStatusLabel(status, t) */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {};

/** @deprecated Use subscriptionPlanLabel(plan, t) */
export const SUBSCRIPTION_PLAN_LABELS: Record<string, string> = {};
