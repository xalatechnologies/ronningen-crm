import type { Translator } from "@/i18n/types";
import type { TranslationKey } from "@/i18n/types";

export type SupportTicketStatus = "open" | "waiting" | "resolved";

export type SupportTicketCategory =
  | "bug"
  | "billing"
  | "access"
  | "feature"
  | "other";

export function supportStatusLabel(
  status: SupportTicketStatus,
  t: Translator,
): string {
  const key = `support.status.${status}` as TranslationKey;
  return t(key);
}

export function supportStatusDescription(
  status: SupportTicketStatus,
  t: Translator,
): string {
  const key = `support.statusDescription.${status}` as TranslationKey;
  return t(key);
}

export function supportCategoryLabel(
  category: SupportTicketCategory,
  t: Translator,
): string {
  const key = `support.category.${category}` as TranslationKey;
  return t(key);
}

/** @deprecated Use supportStatusLabel(status, t) */
export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "",
  waiting: "",
  resolved: "",
};

/** @deprecated Use supportStatusDescription(status, t) */
export const SUPPORT_STATUS_DESCRIPTIONS: Record<SupportTicketStatus, string> = {
  open: "",
  waiting: "",
  resolved: "",
};

/** @deprecated Use supportCategoryLabel(category, t) */
export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  bug: "",
  billing: "",
  access: "",
  feature: "",
  other: "",
};

export const SUPPORT_SETTABLE_STATUSES: SupportTicketStatus[] = [
  "open",
  "waiting",
  "resolved",
];

export const SUPPORT_TICKET_CATEGORIES: SupportTicketCategory[] = [
  "bug",
  "billing",
  "access",
  "feature",
  "other",
];

export function isSupportTicketStatus(
  value: string,
): value is SupportTicketStatus {
  return value === "open" || value === "waiting" || value === "resolved";
}

export function isSupportTicketCategory(
  value: string,
): value is SupportTicketCategory {
  return (
    value === "bug" ||
    value === "billing" ||
    value === "access" ||
    value === "feature" ||
    value === "other"
  );
}
