"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useInvoicesQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const UnpaidInvoicesSection = dynamic(
  () =>
    import("@/components/invoices/unpaid-invoices-section").then((m) => ({
      default: m.UnpaidInvoicesSection,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

export function InvoicesPageClient() {
  const { data, isPending } = useInvoicesQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <UnpaidInvoicesSection
      rows={data.rows}
      loadError={data.loadError}
      canMarkInvoicesPaid={data.canMarkInvoicesPaid}
    />
  );
}
