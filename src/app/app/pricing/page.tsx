import { PricingSection } from "@/components/pricing/pricing-section";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();

  const { data: packages, error: pErr } = await supabase
    .from("packages")
    .select("*")
    .eq("organization_id", orgId)
    .order("price", { ascending: true });

  const { data: services, error: sErr } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  const loadError = pErr?.message ?? sErr?.message ?? null;

  return (
    <PricingSection
      packages={packages ?? []}
      services={services ?? []}
      loadError={loadError}
    />
  );
}
