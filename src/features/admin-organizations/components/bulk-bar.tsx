"use client";

import { Download, PauseCircle, PlayCircle, TimerReset, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";

type Props = { count: number; busy: boolean; onSuspend: () => void; onUnsuspend: () => void; onExtendTrial: () => void; onExport: () => void; onClear: () => void };

/** Appears at the bottom while organizations are selected, with the actions that apply to all of them. */
export function BulkBar({ count, busy, onSuspend, onUnsuspend, onExtendTrial, onExport, onClear }: Props) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label={t("admin.orgs_selected_aria")}
      className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/15 sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <p className="flex items-center gap-2 px-1 text-app-sm font-semibold text-foreground">
        <span className="tabular-nums">{t("admin.orgs_selected_count", { count })}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <X className="size-4" aria-hidden />
          {t("admin.orgs_clear_selection")}
        </Button>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onExport}>
          <Download className="size-4" aria-hidden />
          {t("admin.orgs_export_selected", { count })}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onExtendTrial}>
          <TimerReset className="size-4" aria-hidden />
          {t("admin.utvid_prove")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onUnsuspend}>
          <PlayCircle className="size-4" aria-hidden />
          {t("admin.opphev_suspensjon")}
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={onSuspend}>
          <PauseCircle className="size-4" aria-hidden />
          {t("admin.suspender")} ({count})
        </Button>
      </div>
    </div>
  );
}
