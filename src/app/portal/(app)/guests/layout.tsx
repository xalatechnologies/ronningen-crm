import { GuestsSubNav } from "@/components/portal/guests-subnav";
import { countActivities } from "@/lib/portal/activities";
import { getPortalContext } from "@/lib/portal/context";
import { countGiftWishes } from "@/lib/portal/gifts";
import { getInviteDesign } from "@/lib/portal/invite-design";
import { countSeatingTables } from "@/lib/portal/seating";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Everything about the guests shares one tab row (guest list, invitation, activities, gift wishes). */
export default async function GuestsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  if (!ctx) return <>{children}</>;
  const supabase = await createServerSupabaseClient();
  const [design, activities, gifts, tables] = await Promise.all([
    getInviteDesign(supabase, ctx.booking.id),
    countActivities(supabase, ctx.booking.id),
    countGiftWishes(supabase, ctx.booking.id),
    countSeatingTables(supabase, ctx.booking.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <GuestsSubNav inviteStatus={design ? design.status : "none"} activities={activities} gifts={gifts} tables={tables} />
      {children}
    </div>
  );
}
