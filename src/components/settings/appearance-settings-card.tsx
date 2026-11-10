"use client";

import { useTranslation } from "@/i18n/client";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DisplayDensityToggle } from "@/components/display/display-density-toggle";
import { Label } from "@/components/ui/label";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

export function AppearanceSettingsCard() {
  const { t } = useTranslation();

  return (
    <section className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6 lg:col-span-2")}>
      <div className="flex items-start gap-3 border-b border-rn-border-strong/50 pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-rn-border-strong/70 bg-muted/30 text-muted-foreground">
          <Palette className="size-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
            {t("settings.appearance.title")}
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">
            {t("settings.appearance.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3">
          <Label className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("common.theme.label")}
          </Label>
          <ThemeToggle />
        </div>

        <div className="space-y-3">
          <Label className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("settings.appearance.densityLabel")}
          </Label>
          <DisplayDensityToggle />
        </div>

        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <Label className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("common.language.label")}
          </Label>
          <LanguageSwitcher variant="segment" />
        </div>
      </div>
    </section>
  );
}
