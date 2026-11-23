"use client";

import { AlertTriangle, Building2, CheckCircle2, TrendingUp } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import type { AdminOrgOverviewStats } from "@/features/admin-organizations/lib/org-list";
import { useTranslation } from "@/i18n/client";
import { formatNok } from "@/lib/admin/revenue-metrics";

/** Four numbers on top: all organizations, active ones, those that need follow-up, and total revenue. */
export function OrgStats({ stats }: { stats: AdminOrgOverviewStats }) {
  const { t } = useTranslation();
  const venues = stats.totalVenues === 0 ? t("admin.ingen_lokaler_registrert_enna") : t(stats.totalVenues === 1 ? "admin.orgs_venues_one" : "admin.orgs_venues_other", { count: stats.totalVenues });
  return (
    <section aria-label={t("admin.nokkeltall")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Building2} label={t("admin.totalt")} value={stats.total} caption={venues} />
      <StatCard icon={CheckCircle2} label={t("admin.aktive")} value={stats.active} caption={t("admin.trialing_og_aktive_abonnement")} />
      <StatCard
        icon={AlertTriangle}
        label={t("admin.trenger_oppfolging")}
        value={stats.needsFollowUp}
        valueClassName={stats.needsFollowUp > 0 ? "text-status-warning-text" : undefined}
        caption={stats.needsFollowUp === 0 ? t("admin.ingen_organisasjoner_trenger_oppfolging") : t("admin.ufullstendig_forfalt_eller_suspendert")}
      />
      <StatCard icon={TrendingUp} label={t("admin.total_inntekt")} value={formatNok(stats.totalRevenue)} caption={t("admin.fakturert_bookinginntekt")} />
    </section>
  );
}
