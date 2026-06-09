import type { SupabaseClient } from "@supabase/supabase-js";

const REFERENCE_PATTERN = /^RN-(\d{4})-(\d+)$/i;

export function buildBookingReference(year: number, sequence: number): string {
  return `RN-${year}-${String(sequence).padStart(3, "0")}`;
}

export function referenceYearFromEventDate(eventDate: string | undefined): number {
  const yearPart = eventDate?.trim().slice(0, 4);
  const parsed = yearPart ? Number.parseInt(yearPart, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
}

export async function suggestNextBookingReference(
  supabase: SupabaseClient,
  organizationId: string,
  year: number,
): Promise<string> {
  const prefix = `RN-${year}-`;
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_reference")
    .eq("organization_id", organizationId)
    .ilike("booking_reference", `${prefix}%`)
    .limit(200);

  if (error) {
    throw error;
  }

  let maxSequence = 0;
  for (const row of data ?? []) {
    const ref = row.booking_reference?.trim() ?? "";
    const match = REFERENCE_PATTERN.exec(ref);
    if (!match) continue;
    const refYear = Number.parseInt(match[1]!, 10);
    if (refYear !== year) continue;
    maxSequence = Math.max(maxSequence, Number.parseInt(match[2]!, 10));
  }

  return buildBookingReference(year, maxSequence + 1);
}
