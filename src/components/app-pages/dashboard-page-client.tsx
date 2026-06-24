"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useDashboardQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const DashboardHome = dynamic(
  () =>
    import("@/components/dashboard/dashboard-home").then((m) => ({
      default: m.DashboardHome,
    })),
  { loading: () => <AppPageSkeleton variant="dashboard" /> },
);

export function DashboardPageClient() {
  const { data, isPending } = useDashboardQuery();
  if (isPending && !data) return <AppPageSkeleton variant="dashboard" />;
  if (!data) return null;
  return <DashboardHome data={data} />;
}
