import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

/** Default-locale translator safe for shared client/server modules. */
export function getDefaultT() {
  return createTranslator(getDictionary(defaultLocale));
}
