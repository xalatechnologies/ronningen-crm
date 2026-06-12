import { OrgSupportPanel } from "@/components/support/org-support-panel";
import { fetchOrgSupportOverview } from "@/lib/support/queries";
import { requireOrgMember } from "@/lib/support/require-org-member";

export const dynamic = "force-dynamic";

export default async function SupportSettingsPage() {
  const { orgId } = await requireOrgMember();
  const data = await fetchOrgSupportOverview(orgId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="app-title">Support</h1>
        <p className="mt-2 text-app-base text-muted-foreground">
          Send meldinger til plattformsupport og følg opp sakene dine.
        </p>
      </div>
      <OrgSupportPanel data={data} />
    </div>
  );
}
