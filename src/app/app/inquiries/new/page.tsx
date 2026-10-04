import { NewInquiryForm } from "@/components/inquiries/new-inquiry-form";
import { canManageBookings } from "@/lib/role-access";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sortBookingPackagesByCatalogOrder } from "@/lib/validations";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function NewInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canEdit = canManageBookings(role);
  const sp = await searchParams;

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  let initialCustomerId: string | undefined;
  const rawId = sp.customerId?.trim();
  if (rawId && z.string().uuid().safeParse(rawId).success) {
    const list = customers ?? [];
    if (list.some((c) => c.id === rawId)) {
      initialCustomerId = rawId;
    }
  }

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, description, price")
    .eq("organization_id", orgId)
    .eq("active", true);
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("name", { ascending: true });

  return (
    <NewInquiryForm
      properties={properties ?? []}
      customers={customers ?? []}
      packages={sortBookingPackagesByCatalogOrder(
        (packages ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          price: Number(row.price),
        })),
      )}
      addons={(services ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: Number(row.price),
      }))}
      canManageInquiries={canEdit}
      initialCustomerId={initialCustomerId}
    />
  );
}
