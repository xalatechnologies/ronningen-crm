import { ActivitiesView } from "@/components/portal/activities-view";
import { listActivities } from "@/lib/portal/activities";
import { getPortalContext } from "@/lib/portal/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalActivitiesPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { items, guests } = await listActivities(await createServerSupabaseClient(), ctx.booking.id);

  return (
    <div className="flex flex-col gap-6">
      <ActivitiesView items={items} guests={guests} />
    </div>
  );
}
