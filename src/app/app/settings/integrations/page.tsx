import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { CalendarFeedPanel } from "@/components/settings/calendar-feed-panel";
import { getServerTranslation } from "@/i18n/server";
import { fetchCalendarFeedForOrg } from "@/lib/calendar/get-feed";
import { requireOrgAdminSettingsAccess } from "@/lib/settings/require-settings-access";
import { getCachedServerSupabaseClient } from "@/lib/supabase/cached-server-client";

export const dynamic = "force-dynamic";

async function resolveOrigin(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "https://eventmanager.no";
}

export default async function IntegrationsSettingsPage() {
  const { t } = await getServerTranslation();
  const [supabase, { orgId, role }] = await Promise.all([
    getCachedServerSupabaseClient(),
    requireOrgAdminSettingsAccess(),
  ]);

  // Feed management (view/rotate/disable) is owner-only. Admins can see the
  // settings entry but not the panel itself.
  if (role !== "owner") {
    redirect("/app/settings");
  }

  const [{ data: org, error }, feed, origin] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle(),
    fetchCalendarFeedForOrg(orgId),
    resolveOrigin(),
  ]);

  if (error || !org) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("appPages.settings.integrations.title")}
        description={t("appPages.settings.integrations.description")}
      />
      <CalendarFeedPanel
        organizationId={org.id}
        organizationName={org.name}
        initialFeed={feed}
        origin={origin}
      />
    </div>
  );
}
