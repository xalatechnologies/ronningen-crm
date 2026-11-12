import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getPortalContext } from "@/lib/portal/context";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  // Signed in (middleware guarantees it) but not a customer: staff belong in the venue app.
  if (!ctx) redirect("/app/dashboard");
  return <PortalShell organizationName={ctx.organization.name} logoUrl={ctx.organization.logoUrl}>{children}</PortalShell>;
}
