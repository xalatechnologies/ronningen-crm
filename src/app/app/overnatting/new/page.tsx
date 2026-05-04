import { NewAccommodationReservationForm } from "@/components/overnatting/new-accommodation-reservation-form";
import { canManageBookings } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/constants/roles";
import { z } from "zod";

export const dynamic = "force-dynamic";

export default async function NewAccommodationReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const sp = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canEdit = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    canEdit = canManageBookings(profile?.role as UserRole | undefined);
  }

  const { data: rawUnits } = await supabase
    .from("accommodation_units")
    .select("id, name, max_guests, active")
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
