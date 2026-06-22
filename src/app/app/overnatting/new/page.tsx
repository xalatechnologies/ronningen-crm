import { NewAccommodationReservationForm } from "@/components/overnatting/new-accommodation-reservation-form";
import { canManageBookings } from "@/lib/role-access";
import { resolveServerOrganizationContext } from "@/lib/organizations/organization-context";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function NewAccommodationReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { role } = await resolveServerOrganizationContext(supabase);
  const canEdit = canManageBookings(role);
  const sp = await searchParams;

  const { data: rawUnits } = await supabase
    .from("accommodation_units")
    .select("id, name, max_guests, active")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const units =
    rawUnits?.map((u) => ({
      id: u.id,
      name: u.name,
      maxGuests: Number(u.max_guests) || 1,
      active: u.active,
    })) ?? [];

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");

  let initialCustomerId: string | undefined;
  const rawId = sp.customerId?.trim();
  if (rawId && z.string().uuid().safeParse(rawId).success) {
    const list = customers ?? [];
    if (list.some((c) => c.id === rawId)) initialCustomerId = rawId;
  }

  return (
    <NewAccommodationReservationForm
      units={units}
      customers={customers ?? []}
      canManage={canEdit}
      initialCustomerId={initialCustomerId}
    />
  );
}
