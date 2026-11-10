import type { Dictionary, TranslationKey, TranslationParams } from "@/i18n/types";

function resolveTranslation(
  dictionary: Dictionary,
  key: string,
): string | undefined {
  const parts = key.split(".");
  let current: unknown = dictionary;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value == null ? `{${name}}` : String(value);
  });
}

export function createTranslator(dictionary: Dictionary) {
  return function t(key: TranslationKey, params?: TranslationParams): string {
    const value = resolveTranslation(dictionary, key);
    if (value == null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Missing translation: ${key}`);
      }
      return key;
    }
    return interpolate(value, params);
  };
}
