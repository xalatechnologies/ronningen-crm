"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { usePricingQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const PricingSection = dynamic(
  () =>
    import("@/components/pricing/pricing-section").then((m) => ({
      default: m.PricingSection,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

export function PricingPageClient() {
  const { data, isPending } = usePricingQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <PricingSection
      packages={data.packages}
      services={data.services}
      loadError={data.loadError}
    />
  );
}
