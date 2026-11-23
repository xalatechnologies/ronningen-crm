import { CalendarCheck, MessageCircle, Settings2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { PortalInboxView } from "@/features/portal-inbox/components/portal-inbox-view";
import { getServerTranslation } from "@/i18n/server";
import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { isAdmin } from "@/lib/organizations/organization-permissions";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { listPortalInbox } from "@/lib/portal/inbox";
import { parseInboxFilter } from "@/lib/portal/inbox-rules";
import { todayInOslo } from "@/lib/portal/rsvp-rules";
import { canManageBookings } from "@/lib/role-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalInboxPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { role } = await getCachedServerOrganizationContext();
  if (!canManageBookings(role)) redirect("/app/bookings");
  const { t } = await getServerTranslation();
  const filter = parseInboxFilter((await searchParams).filter);

  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  const { data: org } = await supabase.from("organizations").select("portal_enabled" as "id").eq("id", orgId).maybeSingle();
  const enabled = Boolean((org as unknown as { portal_enabled?: boolean } | null)?.portal_enabled);

  const header = <AppPageHeader surface="card" compact className="mb-0" title={t("portal.inbox.title")} description={t("portal.inbox.lead")} />;

  if (!enabled) {
    const steps = [
      { Icon: Settings2, text: t("portal.inbox.offStep1") },
      { Icon: CalendarCheck, text: t("portal.inbox.offStep2") },
      { Icon: MessageCircle, text: t("portal.inbox.offStep3") },
    ];
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className="flex flex-col gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/8 md:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-xl font-bold text-rn-text-heading">{t("portal.inbox.offTitle")}</h2>
            <p className="max-w-xl text-muted-foreground">{t("portal.inbox.offBody")}</p>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-app-xs font-bold tracking-wide text-muted-foreground uppercase">{t("portal.inbox.offStepsTitle")}</h3>
            <ol className="grid gap-3 md:grid-cols-3">
              {steps.map(({ Icon, text }, i) => (
                <li key={text} className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-app-xs font-bold text-success">{i + 1}</span>
                    <span className="text-app-base font-medium text-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {isAdmin(role) ? (
            <Link href="/app/settings/kontrakter" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-success px-5 text-app-sm font-semibold text-white">
              {t("portal.inbox.offCta")}
            </Link>
          ) : null}
        </section>
      </div>
    );
  }

  const rows = await listPortalInbox(supabase, orgId);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <PortalInboxView rows={rows} initialFilter={filter} today={todayInOslo()} />
    </div>
  );
}
