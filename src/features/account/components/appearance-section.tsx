"use client";

import { Palette } from "lucide-react";

import { DisplayDensityToggle } from "@/components/display/display-density-toggle";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AccountCard, Field } from "@/features/account/components/account-card";
import { useTranslation } from "@/i18n/client";

/** Colour theme, display density and language. Each control keeps its own behaviour and saves on change. */
export function AppearanceSection() {
  const { t } = useTranslation();
  return (
    <AccountCard id="account-appearance" icon={Palette} title={t("settings.appearance.title")} description={t("settings.appearance.description")}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("common.theme.label")} hint={t("settings.appearance.themeHint")}>
          <ThemeToggle />
        </Field>
        <Field label={t("settings.appearance.densityLabel")} hint={t("settings.appearance.densityHint")}>
          <DisplayDensityToggle />
        </Field>
        <Field label={t("common.language.label")} hint={t("settings.appearance.languageHint")}>
          <LanguageSwitcher variant="segment" />
        </Field>
      </div>
    </AccountCard>
  );
}
