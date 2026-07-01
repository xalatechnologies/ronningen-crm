import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { validationNb } from "@/i18n/dictionaries/parts/validation";

export type ValidationMessages = {
  [K in keyof typeof validationNb]: string;
};

function validationFromDictionary(
  dict: ReturnType<typeof getDictionary>,
): ValidationMessages {
  const v = dict.forms.validation;
  return { ...v };
}

export function validationMessagesForLocale(locale: Locale): ValidationMessages {
  return validationFromDictionary(getDictionary(locale));
}

export const defaultValidationMessages = validationMessagesForLocale("nb");
