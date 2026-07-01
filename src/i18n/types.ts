import type { Locale } from "@/i18n/config";
import type { nb } from "@/i18n/dictionaries/nb";

export type Dictionary = LeafStrings<typeof nb>;

type LeafStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : LeafStrings<T[K]>;
};

export type TranslationParams = Record<string, string | number>;

export type Translator = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

type Primitive = string | number | boolean | null | undefined;

type DeepLeafPaths<T, Prefix extends string = ""> = T extends Primitive
  ? Prefix extends ""
    ? never
    : Prefix
  : T extends readonly (infer Item)[]
    ? DeepLeafPaths<Item, Prefix>
    : {
        [K in keyof T & string]: DeepLeafPaths<
          T[K],
          Prefix extends "" ? K : `${Prefix}.${K}`
        >;
      }[keyof T & string];

export type TranslationKey = DeepLeafPaths<typeof nb>;

export type Formatters = {
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
};

export type TranslationContext = {
  locale: Locale;
  t: Translator;
  setLocale: (locale: Locale) => void;
} & Formatters;
