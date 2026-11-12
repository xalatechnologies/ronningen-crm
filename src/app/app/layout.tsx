import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { getImpersonationContext } from "@/lib/admin/impersonation";
import { requireTenantAppAccess } from "@/lib/organizations/require-tenant-app-access";
import { touchOrganizationActivity } from "@/lib/organizations/touch-organization-activity";
import { headers } from "next/headers";
import { after } from "next/server";

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/app";

  const access = await requireTenantAppAccess(pathname);
  const impersonation = await getImpersonationContext();

  // Platform admins viewing as the organization must not count as tenant activity.
  if (!impersonation && access.organizationId) {
    const organizationId = access.organizationId;
    after(() => touchOrganizationActivity(organizationId));
  }

  return (
    <>
      {impersonation ? (
        <ImpersonationBanner organizationName={impersonation.organizationName} />
      ) : null}
      <ProtectedLayout impersonationOrgId={impersonation?.organizationId ?? null}>
        {children}
      </ProtectedLayout>
    </>
  );
}
