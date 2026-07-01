"use client";

import { useTranslation } from "@/i18n/client";
import { useMemo } from "react";

const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export function useCalendarWeekdays() {
  const { t } = useTranslation();
  return useMemo(
    () => WEEKDAY_KEYS.map((key) => t(`calendar.weekdays.${key}`)),
    [t],
  );
}
