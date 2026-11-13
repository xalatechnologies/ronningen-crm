import { ScheduleView } from "@/components/portal/schedule-view";
import { getServerTranslation } from "@/i18n/server";
import { getPortalContext } from "@/lib/portal/context";
import { listScheduleItems, listScheduleVersions, scheduleContentHash } from "@/lib/portal/schedule";
import { shareState } from "@/lib/portal/schedule-rules";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalSchedulePage() {
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const { t } = await getServerTranslation();
  const supabase = await createServerSupabaseClient();
  const [entries, versions] = await Promise.all([
    listScheduleItems(supabase, ctx.booking.id),
    listScheduleVersions(supabase, ctx.booking.id),
  ]);
  const latest = versions[0] ?? null;
  const state = shareState({
    itemCount: entries.length,
    currentHash: scheduleContentHash(entries),
    latest: latest ? { version: latest.version, contentHash: latest.contentHash, acknowledged: Boolean(latest.acknowledgedAt) } : null,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{t("portal.schedule.title")}</h1>
        <p className="text-muted-foreground">{t("portal.schedule.lead", { org: ctx.organization.name })}</p>
      </header>
      <ScheduleView
        entries={entries}
        state={state}
        orgName={ctx.organization.name}
        latest={
          latest
            ? { version: latest.version, sharedAt: latest.sharedAt, acknowledgedAt: latest.acknowledgedAt, staffNote: latest.staffNote }
            : null
        }
      />
    </div>
  );
}
