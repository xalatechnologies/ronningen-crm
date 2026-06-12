import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { getImpersonationContext } from "@/lib/admin/impersonation";
import { requireTenantAppAccess } from "@/lib/organizations/require-tenant-app-access";
import { headers } from "next/headers";

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "/app";

  await requireTenantAppAccess(pathname);
  const impersonation = await getImpersonationContext();

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
