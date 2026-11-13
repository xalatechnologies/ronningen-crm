import { getServerTranslation } from "@/i18n/server";
import { CustomerMessageThread } from "@/components/portal/customer-message-thread";
import { getPortalContext } from "@/lib/portal/context";
import { listThread } from "@/lib/portal/messages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalMessagesPage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const messages = await listThread(supabase, ctx.booking.id, {
    customerName: ctx.fullName,
    venueName: ctx.organization.name,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t("portal.messages.title")}</h1>
        <p className="text-muted-foreground">{t("portal.messages.lead", { org: ctx.organization.name })}</p>
      </header>
      <CustomerMessageThread messages={messages} />
    </div>
  );
}
