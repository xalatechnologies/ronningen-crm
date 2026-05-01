import { PricingSection } from "@/components/pricing/pricing-section";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabase = await createServerSupabaseClient();

  const { data: packages, error: pErr } = await supabase
    .from("packages")
    .select("*")
    .order("price", { ascending: true });

  const { data: services, error: sErr } = await supabase
    .from("services")
    .select("*")
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
