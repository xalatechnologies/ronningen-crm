import type { PartnerRow } from "@/features/customers/types";
import type { Translator } from "@/i18n/types";
import { PARTNER_CATEGORY_PRESETS } from "@/lib/validations";

export function partnerCategoryLabel(category: string, t: Translator): string {
  const preset = PARTNER_CATEGORY_PRESETS.find((p) => p.value === category);
  if (preset) {
    return t(`customers.partnerCategories.${preset.value}`);
  }
  return category;
}

export function partnerLabelToCategoryLocalized(input: string, t: Translator): string {
  const trimmed = input.trim();
  for (const preset of PARTNER_CATEGORY_PRESETS) {
    const translated = t(`customers.partnerCategories.${preset.value}`);
    if (
      translated.toLowerCase() === trimmed.toLowerCase() ||
      preset.label.toLowerCase() === trimmed.toLowerCase()
    ) {
      return preset.value;
    }
  }
  return trimmed;
}

export function partnerCategorySuggestions(t: Translator): string[] {
  return PARTNER_CATEGORY_PRESETS.map((p) =>
    t(`customers.partnerCategories.${p.value}`),
  );
}

/** Free-text search over name, e-mail, phone and the translated category label. */
export function filterPartners(partners: readonly PartnerRow[], query: string, t: Translator): PartnerRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...partners];
  return partners.filter((p) =>
    [p.name, p.email ?? "", p.phone ?? "", partnerCategoryLabel(p.category, t)].join(" ").toLowerCase().includes(q),
  );
}
