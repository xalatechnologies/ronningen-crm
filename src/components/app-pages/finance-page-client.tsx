"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useFinanceQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const FinanceSection = dynamic(
  () =>
    import("@/components/finance/finance-section").then((m) => ({
      default: m.FinanceSection,
    })),
  { loading: () => <AppPageSkeleton variant="kpi" /> },
);

export function FinancePageClient() {
  const { data, isPending } = useFinanceQuery();
  if (isPending && !data) return <AppPageSkeleton variant="kpi" />;
  if (!data) return null;
  return (
    <FinanceSection
      transactions={data.transactions}
      properties={data.properties}
      loadError={data.loadError}
      canManageTransactions={data.canManageTransactions}
    />
  );
}
