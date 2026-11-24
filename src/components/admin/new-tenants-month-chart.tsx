"use client";

import { AdminTrendChart } from "@/components/admin/admin-trend-chart";
import { useTranslation } from "@/i18n/client";
import { buildDailyNewOrgsMonthTrend } from "@/lib/admin/trend-data";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const navButton =
  "flex size-9 items-center justify-center rounded-xl border border-foreground/25 bg-card text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

/** New organizations per day for one calendar month, with back/forward month navigation. */
export function NewTenantsMonthChart({ createdAts }: { createdAts: string[] }) {
  const { t, locale } = useTranslation();
  const [offset, setOffset] = useState(0); // 0 = current month, -1 = last month, ...

  const view = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const points = buildDailyNewOrgsMonthTrend(createdAts, d.getFullYear(), d.getMonth());
    const raw = d.toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO", {
      month: "long",
      year: "numeric",
    });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    return { points, label, total: points.reduce((sum, p) => sum + p.value, 0) };
  }, [createdAts, offset, locale]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className={navButton}
          aria-label={t("calendar.prevMonth")}
          onClick={() => setOffset((o) => o - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="min-w-32 text-center text-sm font-semibold">{view.label}</span>
        <button
          type="button"
          className={cn(navButton)}
          aria-label={t("calendar.nextMonth")}
          disabled={offset >= 0}
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <AdminTrendChart
        className="admin-overview-trend-chart"
        embedded
        title={t("admin.nye_leietakere")}
        subtitle={t("admin.organisasjoner_registrert_per_dag")}
        periodHint={t("admin.overview_month_total", { month: view.label, count: view.total })}
        points={view.points}
      />
    </div>
  );
}
