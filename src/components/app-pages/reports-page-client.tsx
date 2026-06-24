"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useReportsQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const ReportsSection = dynamic(
  () =>
    import("@/components/reports/reports-section").then((m) => ({
      default: m.ReportsSection,
    })),
  { loading: () => <AppPageSkeleton variant="kpi" /> },
);

export function ReportsPageClient() {
  const searchParams = useSearchParams();
  const params = {
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  };
  const { data, isPending } = useReportsQuery(params);
  if (isPending && !data) return <AppPageSkeleton variant="kpi" />;
  if (!data) return null;
  return (
    <ReportsSection
      kpis={data.kpis}
      monthlyRevenue={data.monthlyRevenue}
      eventBreakdown={data.eventBreakdown}
      festTypeBreakdown={data.festTypeBreakdown}
      facility={data.facility}
      reportYear={data.reportYear}
      calendarYearMax={data.calendarYearMax}
      focusMonth={data.focusMonth}
      reportsPeriodLabel={data.reportsPeriodLabel}
      loadError={data.loadError}
      hasRegisteredActivity={data.hasRegisteredActivity}
    />
  );
}
