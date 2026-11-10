import type { Locale } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { nb } from "@/i18n/dictionaries/nb";
import type { Dictionary } from "@/i18n/types";

const dictionaries: Record<Locale, Dictionary> = {
  nb,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.nb;
}
