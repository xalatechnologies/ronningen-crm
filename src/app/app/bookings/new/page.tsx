import {
  NewBookingForm,
  type BookingAddonOption,
  type BookingPackageOption,
  type ExistingCustomer,
  type InquiryPrefill,
} from "@/components/bookings/new-booking-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { sortBookingPackagesByCatalogOrder } from "@/lib/validations";
import { z } from "zod";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; inquiryId?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const sp = await searchParams;

  let inquiryPrefill: InquiryPrefill | null = null;
  let existingCustomer: ExistingCustomer | null = null;

  const rawInq = sp.inquiryId?.trim();
  if (rawInq && z.string().uuid().safeParse(rawInq).success) {
    const { data: inv } = await supabase
      .from("booking_inquiries")
      .select(
        "id, property_id, event_type, fest_type, preferred_event_date, preferred_event_end_date, guest_count, estimated_total, internal_notes, converted_booking_id, customers(id, name, phone, email, address)",
      )
      .eq("organization_id", orgId)
      .eq("id", rawInq)
      .maybeSingle();

    const cust = inv?.customers;
    if (
      inv &&
      !inv.converted_booking_id &&
      cust &&
      typeof cust === "object" &&
      "id" in cust
    ) {
      existingCustomer = {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address ?? null,
      };
      const ymd = (x: string | null | undefined) =>
        x && /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : null;
      const et =
        inv.event_type === "Bedrift" || inv.event_type === "Privat"
          ? inv.event_type
          : "Privat";
      inquiryPrefill = {
        inquiryId: inv.id,
        propertyId: inv.property_id,
        eventType: et,
        festType: inv.fest_type,
        preferredEventDate: ymd(inv.preferred_event_date),
        preferredEventEndDate: ymd(inv.preferred_event_end_date),
        guestCount: Number(inv.guest_count) || 0,
        estimatedTotal:
          inv.estimated_total != null ? Number(inv.estimated_total) : null,
        internalNotes: inv.internal_notes,
      };
    }
  }

  const rawId = sp.customerId?.trim();
  if (!existingCustomer && rawId && z.string().uuid().safeParse(rawId).success) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, email, address")
      .eq("organization_id", orgId)
      .eq("id", rawId)
      .maybeSingle();
    if (data) existingCustomer = data;
  }

  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, description, price")
    .eq("organization_id", orgId)
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
    .eq("organization_id", orgId)
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
      inquiryPrefill={inquiryPrefill}
    />
  );
}
