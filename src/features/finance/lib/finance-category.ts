import type { Translator } from "@/i18n/types";

export const FINANCE_CATEGORY_IDS = [
  "income",
  "rent",
  "deposit",
  "parking",
  "maintenance",
  "tax",
  "insurance",
  "fee",
  "other",
] as const;

export function financeCategorySuggestions(t: Translator): string[] {
  return FINANCE_CATEGORY_IDS.map((id) => t(`finance.categories.${id}`));
}

export function categoryPillClass(category: string) {
  const c = category.toLowerCase();
  if (
    c.includes("inntekt") ||
    c.includes("leie") ||
    c.includes("deposit") ||
    c.includes("park")
  ) {
    return "bg-status-success-bg text-status-success-text";
  }
  if (c.includes("vedlikehold") || c.includes("repar")) {
    return "bg-status-warning-bg text-status-warning-text";
  }
  if (c.includes("skatt")) {
    return "bg-status-info-bg text-status-info-text";
  }
  return "bg-status-neutral-bg text-status-neutral-text";
}
