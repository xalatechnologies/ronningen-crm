import { OrgSupportPanel } from "@/components/support/org-support-panel";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { fetchOrgSupportOverview } from "@/lib/support/queries";
import { requireOrgMember } from "@/lib/support/require-org-member";

export const dynamic = "force-dynamic";

export default async function SupportSettingsPage() {
  const { orgId } = await requireOrgMember();
  const data = await fetchOrgSupportOverview(orgId);

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title="Support"
        description="Send meldinger til plattformsupport og følg opp sakene dine."
      />
      <OrgSupportPanel data={data} />
    </div>
  );
}
