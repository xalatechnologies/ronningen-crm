import type { TenantSupabaseClient } from "@/lib/queries/types";
import type { Database } from "@/types/database.types";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

const PACKAGE_COLUMNS =
  "id, organization_id, name, description, price, active, created_at, updated_at";
const SERVICE_COLUMNS =
  "id, organization_id, name, description, price, active, created_at, updated_at";

export type PricingPageData = {
  packages: PackageRow[];
  services: ServiceRow[];
  loadError: string | null;
};

export async function fetchPricingPageData(
  supabase: TenantSupabaseClient,
  orgId: string,
): Promise<PricingPageData> {
  const { data: packages, error: pErr } = await supabase
    .from("packages")
    .select(PACKAGE_COLUMNS)
    .eq("organization_id", orgId)
    .order("price", { ascending: true });

  const { data: services, error: sErr } = await supabase
    .from("services")
    .select(SERVICE_COLUMNS)
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  const loadError = pErr?.message ?? sErr?.message ?? null;

  return {
    packages: packages ?? [],
    services: services ?? [],
    loadError,
  };
}
