"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useInquiriesQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const InquiriesSection = dynamic(
  () =>
    import("@/components/inquiries/inquiries-section").then((m) => ({
      default: m.InquiriesSection,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

export function InquiriesPageClient() {
  const { data, isPending } = useInquiriesQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <InquiriesSection
      inquiries={data.inquiries}
      properties={data.properties}
      customers={data.customers}
      canManageInquiries={data.canManageInquiries}
      loadError={data.loadError}
    />
  );
}
