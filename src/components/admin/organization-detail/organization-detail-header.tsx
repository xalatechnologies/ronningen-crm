"use client";

import { AdminAccessBadge } from "@/components/admin/admin-access-badge";
import { AdminPlanBadge } from "@/components/admin/admin-badges";
import {
  AdminActionButton,
  AdminLinkButton,
} from "@/components/admin/admin-action-button";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminDetailHeaderMeta } from "@/components/admin/admin-detail-header-meta";
import { AdminDetailTabBar } from "@/components/admin/admin-detail-tab-bar";
import { AdminHealthBadge } from "@/components/admin/admin-health-badge";
import {
  ORGANIZATION_DETAIL_TABS,
  type OrganizationDetailTabId,
} from "@/components/admin/organization-detail/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import { startImpersonation } from "@/lib/admin/actions/impersonation";
import { syncSubscriptionFromOrganization } from "@/lib/admin/actions/billing";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
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

function formatMetaDate(iso: string | null): string | null {
  if (!iso) return null;
  return format(new Date(iso), "d. MMM yyyy", { locale: nb });
}

export function OrganizationDetailHeader({
  org,
  tab,
  onTabChange,
  billingEnabled = false,
}: OrganizationDetailHeaderProps) {
  const router = useRouter();
  const [syncBusy, setSyncBusy] = useState(false);
  const [impersonateBusy, setImpersonateBusy] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");

  const createdLabel = formatMetaDate(org.createdAt);
  const lastActivityLabel = formatMetaDate(org.lastActivityAt);
  const periodEndLabel = formatMetaDate(org.subscriptionPeriodEnd);

  const metaItems = [
    createdLabel ? `Opprettet ${createdLabel}` : null,
    lastActivityLabel
      ? `Sist aktiv ${lastActivityLabel}`
      : "Ingen registrert aktivitet",
    periodEndLabel &&
    ["active", "trialing"].includes(org.subscriptionStatus)
      ? `Periode til ${periodEndLabel}`
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
    toast.success("Abonnement synkronisert");
    router.refresh();
  }

  async function handleImpersonate() {
    const reason = impersonateReason.trim();
    if (reason.length < IMPERSONATION_REASON_MIN) {
      toast.error(`Begrunnelse må være minst ${IMPERSONATION_REASON_MIN} tegn`);
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
        surface="card"
        compact
        detailLayout
        backLink={{
          href: adminRoutes.organizations,
          label: "← Alle organisasjoner",
        }}
        title={org.name}
        description={
          <AdminDetailHeaderMeta
            lead={org.slug}
            items={metaItems}
            badges={
              <>
                <AdminHealthBadge health={org.health} />
                <AdminAccessBadge
                  isSuspended={org.isSuspended}
                  subscriptionStatus={org.subscriptionStatus}
                  providerSubscriptionId={org.providerSubscriptionId}
                  billingEnabled={billingEnabled}
                />
                <AdminPlanBadge plan={org.subscriptionPlan} />
              </>
            }
          />
        }
        actions={
          <>
            <AdminActionButton
              type="button"
              disabled={syncBusy || impersonateBusy}
              onClick={() => void handleSyncSubscription()}
            >
              {syncBusy ? "Synkroniserer…" : "Synk abonnement"}
            </AdminActionButton>
            <AdminActionButton
              type="button"
              disabled={syncBusy || impersonateBusy}
              onClick={() => setImpersonateOpen(true)}
            >
              Se som organisasjon
            </AdminActionButton>
            <AdminLinkButton href="/app/dashboard">
              Åpne dashboard
            </AdminLinkButton>
          </>
        }
        toolbar={
          <AdminDetailTabBar
            tabs={ORGANIZATION_DETAIL_TABS}
            activeTab={tab}
            onTabChange={onTabChange}
            aria-label="Organisasjonsdetaljer"
          />
        }
        toolbarClassName="py-2.5 sm:py-3"
      />

      <AdminConfirmActionDialog
        open={impersonateOpen}
        onOpenChange={(open) => {
          if (!impersonateBusy) {
            setImpersonateOpen(open);
            if (!open) setImpersonateReason("");
          }
        }}
        title="Se som organisasjon"
        description={
          <div className="space-y-3 text-left">
            <p>
              Du logger inn i appen som{" "}
              <strong>{org.name}</strong>. Handlingen logges i revisjonsloggen.
            </p>
            <div className="space-y-2">
              <Label htmlFor="impersonate-reason">Begrunnelse</Label>
              <Textarea
                id="impersonate-reason"
                value={impersonateReason}
                onChange={(event) => setImpersonateReason(event.target.value)}
                placeholder="F.eks. feilsøking av support-sak #123"
                rows={3}
                disabled={impersonateBusy}
              />
              <p className="text-app-xs text-muted-foreground">
                Minst {IMPERSONATION_REASON_MIN} tegn.
              </p>
            </div>
          </div>
        }
        confirmLabel="Start visning"
        busy={impersonateBusy}
        onConfirm={() => void handleImpersonate()}
      />
    </>
  );
}
