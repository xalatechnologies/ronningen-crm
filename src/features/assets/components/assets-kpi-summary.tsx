"use client";

import { StatCard } from "@/components/ui/stat-card";
import { statusTextClass } from "@/components/ui/status-badge";
import { Package, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Translator } from "@/i18n/types";


import type { AssetsInventoryStats } from "@/features/assets/lib/assets-stats";

export function AssetsKpiSummary({
  stats,
  filteredStats,
  filteredCount,
  hasActiveFilters,
  formatCurrency,
  t,
}: {
  stats: AssetsInventoryStats;
  filteredStats: { totalValue: number; totalUnits: number };
  filteredCount: number;
  hasActiveFilters: boolean;
  formatCurrency: (value: number) => string;
  t: Translator;
}) {
  const entriesLabel =
    stats.rowCount === 1
      ? t("assets.registrationWord")
      : t("assets.registrationsWord");
  const unitsLabel =
    stats.totalUnits === 1 ? t("assets.unitWord") : t("assets.unitsWord");

  return (
    <section
      className="assets-kpi-summary grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4"
      aria-label={t("assets.kpiAria")}
    >
      <StatCard
        variant="brand"
        icon={Package}
        label={t("assets.kpiTotal")}
        value={formatCurrency(stats.totalValue)}
        caption={`${stats.rowCount} ${entriesLabel} · ${stats.totalUnits} ${unitsLabel}`}
      >
        {hasActiveFilters ? (
          <p className="assets-filter-hint mt-3 border-t border-white/20 pt-3 text-app-xs text-white/85">
            <span className="font-semibold text-white">{t("assets.filteredLabel")}</span>{" "}
            {formatCurrency(filteredStats.totalValue)} · {filteredStats.totalUnits} {t("assets.unitsWord")} (
            {filteredCount} {filteredCount === 1 ? t("assets.lineWord") : t("assets.linesWord")})
          </p>
        ) : null}
      </StatCard>
      <StatCard
        icon={ShieldCheck}
        label={t("assets.insuredValue")}
        value={formatCurrency(stats.insuredValue)}
        valueClassName={statusTextClass("success")}
      />
      <StatCard
        icon={ShieldAlert}
        label={t("assets.uninsuredValue")}
        value={formatCurrency(stats.uninsuredValue)}
        valueClassName={stats.uninsuredValue > 0 ? statusTextClass("warning") : undefined}
      />
    </section>
  );
}
