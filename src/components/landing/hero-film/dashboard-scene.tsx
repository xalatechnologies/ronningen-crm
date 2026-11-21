"use client";

import { BellDot, CalendarCheck, CheckCircle2, Clock, Wallet } from "lucide-react";
import { useMemo } from "react";

import { StaffShell } from "@/components/landing/hero-film/staff-shell";
import { StatCard } from "@/components/ui/stat-card";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

const BAR_HEIGHTS = [34, 52, 44, 66, 50, 82, 100, 58, 74, 48, 60, 40] as const;
const HIGHLIGHT = 6;
const card = "rounded-2xl bg-card ring-1 ring-foreground/8";

/** The venue dashboard, as in the app: KPI cards, monthly revenue chart, payment alerts. */
export function DashboardScene({ org, customer }: { org: string; customer: string }) {
  const { t, formatCurrency, locale } = useTranslation();
  const months = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => format.format(new Date(2026, i, 1)).replace(".", ""));
  }, [locale]);

  return (
    <StaffShell active="dashboard" org={org}>
      <div className="flex h-full flex-col gap-5">
        <h1 className="app-title">{t("dashboard.title")}</h1>

        <div className="grid grid-cols-4 gap-4">
          {[
            <StatCard key="a" variant="brand" icon={Wallet} label={t("dashboard.totalInvoiced")} value={formatCurrency(842_500)} caption={t("dashboard.kpiBookingsScopeAllYears")} />,
            <StatCard key="b" icon={CheckCircle2} label={t("dashboard.paid")} value={formatCurrency(421_250)} caption={t("dashboard.percentOfInvoiced", { percent: 50 })} />,
            <StatCard key="c" icon={Clock} label={t("dashboard.unpaid")} value={formatCurrency(421_250)} valueClassName="text-destructive" caption={t("dashboard.overdueBookings", { count: 1 })} />,
            <StatCard key="d" icon={CalendarCheck} label={t("dashboard.bookings")} value="18" caption={t("dashboard.venuesInSystemPlural", { count: 2 })} />,
          ].map((node, i) => (
            <div key={i} className="film-rise" style={{ animationDelay: `${i * 110}ms` }}>
              {node}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 gap-4">
          <div className={cn("film-rise col-span-2 flex min-h-0 flex-col p-6", card)} style={{ animationDelay: "420ms" }}>
            <h2 className="app-section-title">{t("dashboard.monthlyRevenue")}</h2>
            <p className="mt-1 app-text-muted">{t("dashboard.revenueSubtitle")}</p>
            <div className="mt-4 flex min-h-0 flex-1 items-end gap-2.5">
              {BAR_HEIGHTS.map((height, i) => (
                <div key={i} className="flex h-full flex-1 items-end">
                  <div
                    className={cn("film-grow-y w-full rounded-t-lg", i === HIGHLIGHT ? "bg-success" : "bg-emerald-500/30")}
                    style={{ height: `${height}%`, animationDelay: `${700 + i * 60}ms` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex gap-2.5">
              {months.map((month, i) => (
                <span key={month} className={cn("min-w-0 flex-1 text-center text-[11px] font-medium uppercase", i === HIGHLIGHT ? "font-bold text-foreground" : "text-muted-foreground")}>
                  {month}
                </span>
              ))}
            </div>
          </div>

          <div className={cn("film-rise flex min-h-0 flex-col p-6", card)} style={{ animationDelay: "560ms" }}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-rn-danger-surface/50 text-destructive">
                <BellDot className="size-4" aria-hidden />
              </span>
              <h2 className="app-section-title">{t("dashboard.paymentAlerts")}</h2>
            </div>
            <div className="flex flex-col gap-2.5 rounded-xl bg-muted/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-app-base font-semibold text-foreground">{customer}</span>
                <span className="shrink-0 text-app-base font-bold tabular-nums text-destructive">{formatCurrency(12_250)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-app-sm text-muted-foreground">
                <span>{t("dashboard.event", { label: "14. jun" })}</span>
                <span className="inline-flex rounded-full bg-rn-danger-surface/70 px-2.5 py-1 text-[11px] font-bold tracking-wide text-rn-danger-ink uppercase">
                  {t("dashboard.overdue")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
