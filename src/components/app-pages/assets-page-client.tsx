"use client";

import { AppPageSkeleton } from "@/components/shared/app-page-skeleton";
import { useAssetsQuery } from "@/hooks/use-tenant-page-queries";
import dynamic from "next/dynamic";

const AssetsSection = dynamic(
  () =>
    import("@/components/assets/assets-section").then((m) => ({
      default: m.AssetsSection,
    })),
  { loading: () => <AppPageSkeleton variant="table" /> },
);

export function AssetsPageClient() {
  const { data, isPending } = useAssetsQuery();
  if (isPending && !data) return <AppPageSkeleton variant="table" />;
  if (!data) return null;
  return (
    <AssetsSection
      assets={data.assets}
      properties={data.properties}
      loadError={data.loadError}
      canManageAssets={data.canManageAssets}
    />
  );
}
