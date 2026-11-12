"use client";

import { useMemo } from "react";

import { useTranslation } from "@/i18n/client";

/** NOK formatter for the current locale ("1 250,50 kr"). */
export function useNok() {
  const { locale } = useTranslation();
  return useMemo(() => {
    const f = new Intl.NumberFormat(locale, { style: "currency", currency: "NOK", maximumFractionDigits: 2 });
    return (value: number) => f.format(value);
  }, [locale]);
}
