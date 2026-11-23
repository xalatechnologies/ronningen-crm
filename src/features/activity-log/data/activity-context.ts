import type { UserRole } from "@/constants/roles";
import { isUserRole } from "@/lib/validations";
import type { TenantSupabaseClient } from "@/lib/queries/types";

export type ActivityPerson = { name: string | null; email: string | null; role: UserRole | null };

export type ActivityContext = {
  people: Map<string, ActivityPerson>;
  bookingReferences: Map<string, string>;
};

const EMPTY: ActivityContext = { people: new Map(), bookingReferences: new Map() };

/**
 * Looks up who the people and bookings named in a page of the log are: name, email and role in this
 * organization for each user, and the reference for each booking. Three small reads, all scoped to the
 * organization. A failed read only means fewer details; the log itself still shows.
 */
export async function loadActivityContext(
  supabase: TenantSupabaseClient,
  organizationId: string,
  userIds: string[],
  bookingIds: string[],
): Promise<ActivityContext> {
  if (userIds.length === 0 && bookingIds.length === 0) return EMPTY;

  const [profiles, members, bookings] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
    userIds.length > 0
      ? supabase.from("organization_members").select("user_id, role").eq("organization_id", organizationId).in("user_id", userIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string; role: string }> }),
    bookingIds.length > 0
      ? supabase.from("bookings").select("id, booking_reference").eq("organization_id", organizationId).in("id", bookingIds)
      : Promise.resolve({ data: [] as Array<{ id: string; booking_reference: string | null }> }),
  ]);

  const roleByUser = new Map((members.data ?? []).map((m) => [m.user_id, isUserRole(m.role) ? m.role : null] as const));
  const people = new Map<string, ActivityPerson>();
  for (const p of profiles.data ?? []) {
    people.set(p.id, {
      name: p.full_name?.trim() || null,
      email: p.email?.trim() || null,
      role: roleByUser.get(p.id) ?? null,
    });
  }

  const bookingReferences = new Map<string, string>();
  for (const b of bookings.data ?? []) {
    if (b.booking_reference) bookingReferences.set(b.id, b.booking_reference);
  }
  return { people, bookingReferences };
}
