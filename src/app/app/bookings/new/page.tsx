import {
  NewBookingForm,
  type BookingAddonOption,
  type BookingPackageOption,
  type ExistingCustomer,
} from "@/components/bookings/new-booking-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sortBookingPackagesByCatalogOrder } from "@/lib/validations";
import { z } from "zod";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const sp = await searchParams;
  const rawId = sp.customerId?.trim();

  let existingCustomer: ExistingCustomer | null = null;
  if (rawId && z.string().uuid().safeParse(rawId).success) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, email, address")
      .eq("id", rawId)
      .maybeSingle();
    if (data) existingCustomer = data;
  }

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, description, price")
    .eq("active", true);

  const bookingPackages: BookingPackageOption[] = sortBookingPackagesByCatalogOrder(
    (packages ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
    })),
  );

  const { data: services } = await supabase
    .from("services")
    .select("id, name, price")
    .eq("active", true)
    .order("name", { ascending: true });

  const bookingAddons: BookingAddonOption[] = (services ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
  }));

  return (
    <NewBookingForm
      existingCustomer={existingCustomer}
      bookingAddons={bookingAddons}
      bookingPackages={bookingPackages}
    />
  );
}
