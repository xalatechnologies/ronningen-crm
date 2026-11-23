"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
  /** Extra buttons next to Save, such as creating the default template. */
  extraActions?: ReactNode;
};

/** A card of settings with its own Save button, which is active only when something changed. */
export function SettingsCard({ title, description, dirty, busy, onSave, onDiscard, children, extraActions }: Props) {
  const { t } = useTranslation();
  return (
    <section className={cn(RN_CARD_SHELL, "flex flex-col gap-5 p-5 md:p-6")}>
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-app-sm text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-foreground/10">{children}</div>
      <div className="flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-4">
        <Button type="button" variant="success" disabled={busy || !dirty} onClick={onSave}>
          {busy ? t("contracts.saving") : t("contracts.saveSettings")}
        </Button>
        {dirty ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={onDiscard}>
            {t("contracts.discard")}
          </Button>
        ) : null}
        {extraActions}
      </div>
    </section>
  );
}
