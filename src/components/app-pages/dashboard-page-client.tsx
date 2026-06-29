"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useDashboardQuery } from "@/hooks/use-tenant-page-queries";
import { consumeBillingActivatedToast } from "@/lib/billing/billing-checkout-return";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { toast } from "sonner";

const DashboardHome = dynamic(
  () =>
    import("@/components/dashboard/dashboard-home").then((m) => ({
      default: m.DashboardHome,
    })),
  { loading: () => <AppPageSkeleton variant="dashboard" /> },
);

export function DashboardPageClient() {
  const { data, isPending } = useDashboardQuery();

  useEffect(() => {
    if (consumeBillingActivatedToast()) {
      toast.success("Abonnement aktivert. Velkommen!");
    }
  }, []);

  if (isPending && !data) return <AppPageSkeleton variant="dashboard" />;
  if (!data) return null;
  return <DashboardHome data={data} />;
}
