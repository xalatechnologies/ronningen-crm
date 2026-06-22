import { AdminFeatureFlagsWorkspace } from "@/components/admin/admin-feature-flags-workspace";
import type { AdminFeatureFlagFilter } from "@/lib/admin/feature-flag-status";
import { fetchAdminFeatureFlagPageData } from "@/lib/admin/queries/feature-flags";
type PageProps = {
  searchParams: Promise<{
    filter?: string;
    q?: string;
  }>;
};

const VALID_FILTERS = new Set<AdminFeatureFlagFilter>([
  "all",
  "active",
  "rollout",
  "off",
  "scheduled",
]);

function parseFilter(value: string | undefined): AdminFeatureFlagFilter {
  if (value && VALID_FILTERS.has(value as AdminFeatureFlagFilter)) {
    return value as AdminFeatureFlagFilter;
  }
  return "all";
}

export default async function AdminFeatureFlagsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const search = params.q ?? "";

  const data = await fetchAdminFeatureFlagPageData();

  return (
    <AdminFeatureFlagsWorkspace
      flags={data.flags}
      orgNames={data.orgNames}
      stats={data.stats}
      billingEnvEnabled={data.billingEnvEnabled}
      initialFilter={filter}
      initialSearch={search}
    />
  );
}
