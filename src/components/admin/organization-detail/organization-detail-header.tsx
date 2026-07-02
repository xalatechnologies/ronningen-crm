"use client";

import { useTranslation } from "@/i18n/client";
import {
  AdminActionButton,
  AdminLinkButton,
} from "@/components/admin/admin-action-button";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import {
  OrganizationDetailAccessBadge,
  OrganizationDetailHealthBadge,
  OrganizationDetailPlanBadge,
} from "@/components/admin/organization-detail/organization-detail-badges";
import { OrganizationDetailMeta } from "@/components/admin/organization-detail/organization-detail-meta";
import { OrganizationDetailTabBar } from "@/components/admin/organization-detail/organization-detail-tab-bar";
import type { OrganizationDetailTabId } from "@/components/admin/organization-detail/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import { startImpersonation } from "@/lib/admin/actions/impersonation";
import { syncSubscriptionFromOrganization } from "@/lib/admin/actions/billing";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const IMPERSONATION_REASON_MIN = 10;

type OrganizationDetailHeaderProps = {
  org: AdminOrganizationDetail;
  tab: OrganizationDetailTabId;
  onTabChange: (tab: OrganizationDetailTabId) => void;
  billingEnabled?: boolean;
};

import type { Locale } from "@/i18n/config";

function formatMetaDate(iso: string | null, locale: Locale): string | null {
  if (!iso) return null;
  return format(new Date(iso), "d. MMM yyyy", { locale: getDateFnsLocale(locale) });
}

export function OrganizationDetailHeader({
  org,
  tab,
  onTabChange,
  billingEnabled = false,
}: OrganizationDetailHeaderProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [syncBusy, setSyncBusy] = useState(false);
  const [impersonateBusy, setImpersonateBusy] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");

  const createdLabel = formatMetaDate(org.createdAt, locale);
  const lastActivityLabel = formatMetaDate(org.lastActivityAt, locale);
  const periodEndLabel = formatMetaDate(org.subscriptionPeriodEnd, locale);

  const metaItems = [
    createdLabel ? t("adminLabels.meta.createdAt", { date: createdLabel }) : null,
    lastActivityLabel
      ? t("adminLabels.meta.lastActiveAt", { date: lastActivityLabel })
      : t("admin.ingen_registrert_aktivitet"),
    periodEndLabel &&
    ["active", "trialing"].includes(org.subscriptionStatus)
      ? t("adminLabels.meta.periodUntil", { date: periodEndLabel })
      : null,
  ].filter((item): item is string => Boolean(item));

  async function handleSyncSubscription() {
    setSyncBusy(true);
    const result = await syncSubscriptionFromOrganization(org.id);
    setSyncBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(t("admin.abonnement_synkronisert"));
    router.refresh();
  }

  async function handleImpersonate() {
    const reason = impersonateReason.trim();
    if (reason.length < IMPERSONATION_REASON_MIN) {
      toast.error(
        t("serverErrors.admin.reasonMinLength", { min: IMPERSONATION_REASON_MIN }),
      );
      return;
    }
    setImpersonateBusy(true);
    const result = await startImpersonation({
      organizationId: org.id,
      reason,
    });
    setImpersonateBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setImpersonateOpen(false);
    setImpersonateReason("");
    router.push("/app/dashboard");
  }

  return (
    <>
      <AppPageHeader
        className="admin-org-detail-header mb-0"
        surface="default"
        compact
        detailLayout
        backLink={{
          href: adminRoutes.organizations,
          label: t("admin.alle_organisasjoner"),
        }}
        title={org.name}
        description={
          <OrganizationDetailMeta
            slug={org.slug}
            items={metaItems}
            badges={
              <>
                <OrganizationDetailHealthBadge health={org.health} />
                <OrganizationDetailAccessBadge
                  isSuspended={org.isSuspended}
                  subscriptionStatus={org.subscriptionStatus}
                  providerSubscriptionId={org.providerSubscriptionId}
                  billingEnabled={billingEnabled}
                  billingExempt={org.billingExempt}
                />
                <OrganizationDetailPlanBadge plan={org.subscriptionPlan} />
              </>
            }
          />
        }
        actions={
          <div className="admin-org-detail-actions flex flex-wrap items-center gap-2 md:gap-3">
            <AdminActionButton
              type="button"
              disabled={syncBusy || impersonateBusy}
              onClick={() => void handleSyncSubscription()}
            >
              {syncBusy ? t("admin.synkroniserer") : t("admin.synk_abonnement")}
            </AdminActionButton>
            <AdminActionButton
              type="button"
              disabled={syncBusy || impersonateBusy}
              onClick={() => setImpersonateOpen(true)}
            >{t("admin.se_som_organisasjon")}</AdminActionButton>
            <AdminLinkButton href="/app/dashboard">
              {t("admin.apne_dashboard")}
            </AdminLinkButton>
          </div>
        }
        toolbar={
          <OrganizationDetailTabBar activeTab={tab} onTabChange={onTabChange} />
        }
        toolbarClassName="border-0 px-0 py-2.5 sm:py-3"
      />

      <AdminConfirmActionDialog
        open={impersonateOpen}
        onOpenChange={(open) => {
          if (!impersonateBusy) {
            setImpersonateOpen(open);
            if (!open) setImpersonateReason("");
          }
        }}
        title={t("admin.se_som_organisasjon")}
        description={
          <div className="space-y-3 text-left">
            <p>
              {t("admin.impersonate_as_org_body", { name: org.name })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="impersonate-reason">{t("adminLabels.fields.reason")}</Label>
              <Textarea
                id="impersonate-reason"
                value={impersonateReason}
                onChange={(event) => setImpersonateReason(event.target.value)}
                placeholder={t("admin.f_eks_feilsoking_av_support_sak_123")}
                rows={3}
                disabled={impersonateBusy}
              />
              <p className="text-app-xs text-muted-foreground">
                {t("admin.impersonate_reason_min_chars", {
                  min: IMPERSONATION_REASON_MIN,
                })}
              </p>
            </div>
          </div>
        }
        confirmLabel={t("admin.start_visning")}
        busy={impersonateBusy}
        onConfirm={() => void handleImpersonate()}
      />
    </>
  );
}
