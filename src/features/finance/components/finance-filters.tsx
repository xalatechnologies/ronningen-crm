"use client";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { FormSelect, toIdNameOptions } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Filter, RotateCcw } from "lucide-react";

const cardClass = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";

const financeToolbarControlClass =
  "box-border h-11 min-h-11 max-h-11 shrink-0 rounded-xl border border-foreground/25 py-0 shadow-none md:h-12 md:min-h-12 md:max-h-12";

/** Venue and date-range filter card on top of the Finans list. State lives in the page. */
export function FinanceFilters({
  properties,
  propertyId,
  onPropertyChange,
  range,
  onFromChange,
  onToChange,
  onThisMonth,
  onReset,
  hasActiveFilters,
}: {
  properties: { id: string; name: string }[];
  propertyId: string;
  onPropertyChange: (id: string) => void;
  range: { from: string; to: string };
  onFromChange: (ymd: string) => void;
  onToChange: (ymd: string) => void;
  onThisMonth: () => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}) {
  const { t } = useTranslation();
  return (
            <section
              className={cn("flex flex-col gap-4 p-4 sm:p-5", cardClass)}
              aria-label={t("finance.filterVenueAria")}
            >
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto] lg:items-end">
                <div className="min-w-0">
                  <Label className="finance-filter-label mb-1.5 block font-semibold text-foreground">
                    {t("finance.filterVenue")}
                  </Label>
                  <FormSelect
                    value={propertyId}
                    onValueChange={onPropertyChange}
                    aria-label={t("finance.filterVenueAria")}
                    className={cn("finance-filter-control w-full bg-card", financeToolbarControlClass)}
                    placeholder={t("finance.allVenues")}
                    options={toIdNameOptions(properties)}
                  />
                </div>
                <div className="min-w-0">
                  <Label
                    htmlFor="finance-filter-from"
                    className="finance-filter-label mb-1.5 block font-semibold text-foreground"
                  >
                    {t("finance.fromDate")}
                  </Label>
                  <DatePickerField
                    id="finance-filter-from"
                    value={range.from}
                    onChange={onFromChange}
                    maxYmd={range.to || undefined}
                    variant="toolbar"
                    className={cn("finance-date-input w-full", financeToolbarControlClass)}
                  />
                </div>
                <div className="min-w-0">
                  <Label
                    htmlFor="finance-filter-to"
                    className="finance-filter-label mb-1.5 block font-semibold text-foreground"
                  >
                    {t("finance.toDate")}
                  </Label>
                  <DatePickerField
                    id="finance-filter-to"
                    value={range.to}
                    onChange={onToChange}
                    minYmd={range.from || undefined}
                    variant="toolbar"
                    className={cn("finance-date-input w-full", financeToolbarControlClass)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "gap-2 rounded-xl border border-foreground/30 bg-card px-4 text-app-sm font-semibold shadow-none hover:bg-muted",
                      financeToolbarControlClass,
                    )}
                    onClick={onThisMonth}
                  >
                    <Filter className="size-4" aria-hidden />
                    {t("finance.thisMonth")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!hasActiveFilters}
                    className={cn("gap-2 rounded-xl px-4 text-app-sm font-semibold", financeToolbarControlClass, "border-0")}
                    onClick={onReset}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    {t("finance.resetFilters")}
                  </Button>
                </div>
              </div>
            </section>
  );
}
