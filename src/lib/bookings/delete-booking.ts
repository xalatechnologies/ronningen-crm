"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DeleteBookingResult = { ok: true } | { ok: false; error: string };

/** Permanently deletes a booking and any contract records attached to it (owner/admin only). */
export async function deleteBookingWithContracts(input: {
  organizationId: string;
  bookingId: string;
}): Promise<DeleteBookingResult> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "delete_booking_with_contracts" as never,
    { p_org: input.organizationId, p_booking: input.bookingId } as never,
  );
  if (error) return { ok: false, error: error.message };

  const paths = (data as string[] | null) ?? [];
  if (paths.length) {
    const { error: storageError } = await createSupabaseAdminClient()
      .storage.from("contract-pdfs")
      .remove(paths);
    if (storageError) console.warn("[bookings] contract pdf cleanup failed", storageError.message);
  }
  revalidatePath("/app/bookings");
  return { ok: true };
}
