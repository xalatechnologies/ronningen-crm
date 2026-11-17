import { SeatingView } from "@/components/portal/seating-view";
import { getPortalContext } from "@/lib/portal/context";
import { listGuests } from "@/lib/portal/guests";
import { loadSeating } from "@/lib/portal/seating";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalTablesPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const supabase = await createServerSupabaseClient();
  const guests = await listGuests(supabase, ctx.booking.id);
  const { tables, unassigned, settings } = await loadSeating(supabase, ctx.booking.id, guests);

  return (
    <div className="flex flex-col gap-6">
      <SeatingView tables={tables} unassigned={unassigned} settings={settings} guestCount={guests.length} />
    </div>
  );
}
