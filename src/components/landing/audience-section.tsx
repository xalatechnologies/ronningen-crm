"use client";

import { LandingSectionShell } from "@/components/landing/landing-section-shell";
import { useTranslation } from "@/i18n/client";
import { getDictionary } from "@/i18n/dictionaries";
import { useMemo } from "react";

export function AudienceSection() {
  const { t, locale } = useTranslation();
  const items = useMemo(
    () => getDictionary(locale).landing.audience.items,
    [locale],
  );

  return (
    <LandingSectionShell
      titleId="landing-audience-title"
      title={t("landing.sections.audience")}
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-card px-5 py-4 font-heading text-base font-semibold text-rn-text-heading shadow-rn-card"
          >
            {item}
          </li>
        ))}
      </ul>
    </LandingSectionShell>
  );
}
