"use client";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import type { AdminAuditCategory } from "@/components/admin/admin-audit-filters";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { FormSelect } from "@/components/ui/form-select";
import { ADMIN_SEGMENT_BAR_CLASS } from "@/components/admin/admin-segment-filter-bar";
import { RN_TEXT_SEGMENT } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Download, RotateCcw } from "lucide-react";

const PERIOD_PRESETS = [
  { label: "7 d", days: 7 },
  { label: "30 d", days: 30 },
  { label: "90 d", days: 90 },
] as const;

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchesPreset(
  from: string,
  to: string,
  days: number,
): boolean {
  return from === isoDateDaysAgo(days) && to === todayIso();
}

type AdminAuditToolbarProps = {
  from: string;
  to: string;
  appliedFrom: string;
  appliedTo: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApplyPeriod: () => void;
  onPresetPeriod: (from: string, to: string) => void;
  selectedCategory: AdminAuditCategory;
  selectedAction: string;
  actionOptions: { value: string; label: string }[];
  onActionChange: (value: string) => void;
  exporting: boolean;
  onExport: () => void;
  onReset: () => void;
  embedded?: boolean;
};

export function AdminAuditToolbar({
  from,
  to,
  appliedFrom,
  appliedTo,
  onFromChange,
  onToChange,
  onApplyPeriod,
  onPresetPeriod,
  selectedCategory,
  selectedAction,
  actionOptions,
  onActionChange,
  exporting,
  onExport,
  onReset,
  embedded = false,
}: AdminAuditToolbarProps) {
  const periodDirty = from !== appliedFrom || to !== appliedTo;
  const hasAppliedPeriod = Boolean(appliedFrom || appliedTo);

  function handlePeriodKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && periodDirty) {
      event.preventDefault();
      onApplyPeriod();
    }
  }

  return (
    <div
      className={cn(
        embedded
          ? "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          : cn(
              ADMIN_SEGMENT_BAR_CLASS,
              "admin-audit-toolbar flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between",
            ),
      )}
      onKeyDown={handlePeriodKeyDown}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3">
        <fieldset className="flex min-w-0 flex-wrap items-center gap-2 border-0 p-0">
          <legend className="mb-0 w-auto max-w-none shrink-0 p-0 text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Periode
          </legend>
          <DatePickerField
            value={from}
            onChange={onFromChange}
            maxYmd={to || undefined}
            className="w-[10.5rem]"
            variant="toolbar"
            aria-label="Fra dato"
          />
          <span
            className="hidden text-muted-foreground sm:inline"
            aria-hidden
          >
            –
          </span>
          <DatePickerField
            value={to}
            onChange={onToChange}
            minYmd={from || undefined}
            className="w-[10.5rem]"
            variant="toolbar"
            aria-label="Til dato"
          />
        </fieldset>

        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Hurtigvalg periode"
        >
          {PERIOD_PRESETS.map((preset) => {
            const active = matchesPreset(from, to, preset.days);
            return (
              <button
                key={preset.days}
                type="button"
                onClick={() =>
                  onPresetPeriod(isoDateDaysAgo(preset.days), todayIso())
                }
                className={cn(
                  RN_TEXT_SEGMENT,
                  "min-h-11 rounded-[length:calc(var(--app-radius)-2px)] border-2 px-3 py-2 text-app-sm transition-colors",
                  active
                    ? "border-rn-accent-border bg-rn-surface-gradient-from font-bold text-success shadow-sm"
                    : "border-transparent font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                aria-pressed={active ? "true" : "false"}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {selectedCategory !== "all" ? (
          <div
            className="flex min-w-0 flex-wrap items-center gap-2 sm:w-auto"
            role="group"
            aria-label="Spesifikk handling"
          >
            <span className="shrink-0 text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Spesifikk handling
            </span>
            <FormSelect
              value={selectedAction}
              onValueChange={onActionChange}
              options={actionOptions}
              aria-label="Spesifikk handling"
              className="min-w-[14rem]"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
        {periodDirty ? (
          <AdminActionButton
            type="button"
            variant="default"
            onClick={onApplyPeriod}
          >
            Bruk periode
          </AdminActionButton>
        ) : hasAppliedPeriod ? (
          <span className="px-1 text-app-xs text-muted-foreground">
            Periode aktiv
          </span>
        ) : null}

        <div
          className="hidden h-8 w-px shrink-0 bg-rn-border-strong/60 sm:block"
          aria-hidden
        />

        <AdminActionButton
          type="button"
          disabled={exporting}
          onClick={onExport}
          className="gap-2"
        >
          <Download className="size-4 shrink-0" aria-hidden />
          {exporting ? "Eksporterer…" : "Eksporter CSV"}
        </AdminActionButton>

        <AdminActionButton
          type="button"
          variant="ghost"
          onClick={onReset}
          className="gap-2"
        >
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          Nullstill filtre
        </AdminActionButton>
      </div>
    </div>
  );
}
