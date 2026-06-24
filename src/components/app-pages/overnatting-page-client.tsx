"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useOvernattingQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const OvernattingSection = dynamic(
  () =>
    import("@/components/overnatting/overnatting-section").then((m) => ({
      default: m.OvernattingSection,
    })),
  { loading: () => <AppPageSkeleton variant="calendar" /> },
);

export function OvernattingPageClient() {
  const searchParams = useSearchParams();
  const ym = searchParams.get("ym") ?? undefined;
  const { data, isPending } = useOvernattingQuery(ym);
  if (isPending && !data) return <AppPageSkeleton variant="calendar" />;
  if (!data) return null;
  return (
    <OvernattingSection
      units={data.units}
      initialReservations={data.initialReservations}
      initialYm={data.initialYm}
      properties={data.properties}
      canManage={data.canManage}
      loadError={data.loadError}
      skipInitialReservationFetch
    />
  );
}
