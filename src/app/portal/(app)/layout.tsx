import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getPortalContext } from "@/lib/portal/context";
import { countUnread } from "@/lib/portal/messages";
import { countQuoted } from "@/lib/portal/wishlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();
  // Signed in (middleware guarantees it) but not a customer: staff belong in the venue app.
  if (!ctx) redirect("/app/dashboard");
  const supabase = await createServerSupabaseClient();
  const [unreadMessages, quotedWishes] = await Promise.all([
    countUnread(supabase, ctx.booking.id, "customer"),
    countQuoted(supabase, ctx.booking.id),
  ]);
  return (
    <PortalShell
      organizationName={ctx.organization.name}
      logoUrl={ctx.organization.logoUrl}
      unreadMessages={unreadMessages}
      quotedWishes={quotedWishes}
    >
      {children}
    </PortalShell>
  );
}
