import type { Translator } from "@/i18n/types";
import type { TranslationKey } from "@/i18n/types";

export type PropertyListRow = {
  id: string;
  name: string;
  address: string | null;
  type: string | null;
  notes: string | null;
  updatedAtIso: string;
};

export function propertyTypeLabel(
  type: string | null,
  t: Translator,
): string {
  if (!type?.trim()) return "—";
  const key = `properties.types.${type}` as TranslationKey;
  const value = t(key);
  return value === key ? type : value;
}
