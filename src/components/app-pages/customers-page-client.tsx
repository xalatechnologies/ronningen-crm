"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useCustomersQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const CustomersSection = dynamic(
  () =>
    import("@/components/customers/customers-section").then((m) => ({
      default: m.CustomersSection,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

/**
 * Auto-merge on page load was removed.
 * Phone-based merge previously collapsed unrelated customers who shared a
 * venue number (e.g. 96665001) onto one row — bookings/inquiries then all
 * showed the same name when that row was renamed.
 * Email-only merge still exists in merge-duplicate-customers.ts for explicit use.
 */
export function CustomersPageClient() {
  const { data, isPending } = useCustomersQuery();

  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <CustomersSection
      customers={data.customers}
      partners={data.partners}
      bookings={data.bookings}
      loadError={data.loadError}
    />
  );
}
