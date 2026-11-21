"use client";

import { StatCard } from "@/components/ui/stat-card";
import { statusTextClass } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";

/** Income, expense and net result for the filtered period, with change against the previous period. */
export function FinanceKpis({
  income,
  expense,
  net,
  margin,
  comparison,
}: {
  income: number;
  expense: number;
  net: number;
  margin: number | null;
  comparison: { dIncome: number | null; dExpense: number | null };
}) {
  const { t, formatCurrency } = useTranslation();
  return (
            <section aria-label={t("finance.kpiAria")} className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
              <StatCard
                icon={TrendingUp}
                label={t("finance.kpiIncome")}
                value={formatCurrency(income)}
                valueClassName={statusTextClass("success")}
              >
                {comparison.dIncome != null ? (
                  <p
                    className={cn(
                      "mt-3 flex items-center gap-1 text-app-xs font-semibold",
                      statusTextClass(comparison.dIncome >= 0 ? "success" : "danger"),
                    )}
                  >
                    {comparison.dIncome >= 0 ? (
                      <ArrowUpRight className="size-4" aria-hidden />
                    ) : (
                      <ArrowDownRight className="size-4" aria-hidden />
                    )}
                    {t("finance.vsPreviousPeriod", { percent: Math.abs(comparison.dIncome).toFixed(1) })}
                  </p>
                ) : (
                  <p className="mt-3 text-app-xs text-muted-foreground">—</p>
                )}
              </StatCard>

              <StatCard
                icon={TrendingDown}
                label={t("finance.kpiExpense")}
                value={formatCurrency(expense)}
                valueClassName={statusTextClass("danger")}
              >
                {comparison.dExpense != null ? (
                  <p
                    className={cn(
                      "mt-3 flex items-center gap-1 text-app-xs font-semibold",
                      statusTextClass(comparison.dExpense <= 0 ? "success" : "danger"),
                    )}
                  >
                    {comparison.dExpense <= 0 ? (
                      <ArrowDownRight className="size-4" aria-hidden />
                    ) : (
                      <ArrowUpRight className="size-4" aria-hidden />
                    )}
                    {t("finance.vsPreviousPeriod", { percent: Math.abs(comparison.dExpense).toFixed(1) })}
                  </p>
                ) : (
                  <p className="mt-3 text-app-xs text-muted-foreground">—</p>
                )}
              </StatCard>

              <StatCard
                variant="brand"
                icon={Wallet}
                label={t("finance.kpiResult")}
                value={`${net >= 0 ? "+" : ""}${formatCurrency(net)}`}
                caption={
                  margin != null
                    ? t("finance.netMargin", { percent: margin.toFixed(1) })
                    : t("finance.noIncomeInPeriod")
                }
              />
            </section>
  );
}
