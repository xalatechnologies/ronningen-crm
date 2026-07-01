import "server-only";

import { cookies } from "next/headers";

import {
  defaultLocale,
  localeCookieName,
  normalizeLocale,
  type Locale,
} from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createFormatters } from "@/i18n/formatters";
import { createTranslator } from "@/i18n/translate";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(localeCookieName)?.value;
  return normalizeLocale(value);
}

export async function getServerDictionary() {
  const locale = await getServerLocale();
  return getDictionary(locale);
}

export async function getServerTranslation() {
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const t = createTranslator(dictionary);
  const formatters = createFormatters(locale);
  return { locale, dictionary, t, ...formatters };
}
