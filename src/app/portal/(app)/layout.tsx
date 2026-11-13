import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getServerTranslation } from "@/i18n/server";
import { getPortalAccess } from "@/lib/portal/context";
import { countUnread } from "@/lib/portal/messages";
import { countWishAttention } from "@/lib/portal/wishlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const access = await getPortalAccess();
  if (access.state === "closed") {
    const { t } = await getServerTranslation();
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-background px-5 py-12 text-center text-foreground">
        <div className="flex max-w-sm flex-col gap-2 rounded-2xl bg-card p-6 ring-1 ring-foreground/8">
          <h1 className="font-heading text-xl font-bold">{t("portal.closed.title")}</h1>
          <p className="text-muted-foreground">{t("portal.closed.body", { org: access.organizationName })}</p>
        </div>
      </main>
    );
  }
  // Signed in (middleware guarantees it) but not a customer: staff belong in the venue app.
  if (access.state !== "ok") redirect("/app/dashboard");
  const ctx = access.ctx;
  const supabase = await createServerSupabaseClient();
  const [unreadMessages, wishes] = await Promise.all([
    countUnread(supabase, ctx.booking.id, "customer"),
    countWishAttention(supabase, ctx.booking.id),
  ]);
  return (
    <PortalShell
      organizationName={ctx.organization.name}
      logoUrl={ctx.organization.logoUrl}
      unreadMessages={unreadMessages}
      quotedWishes={wishes.quoted + wishes.unavailable}
    >
      {children}
    </PortalShell>
  );
}
