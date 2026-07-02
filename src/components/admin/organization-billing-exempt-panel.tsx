"use client";

import { useTranslation } from "@/i18n/client";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import {
  cancelStripeForBillingExemptOrganization,
  setOrganizationBillingExempt,
} from "@/lib/admin/actions/billing-exempt";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrganizationBillingExemptPanelProps = {
  organizationId: string;
  billingExempt: boolean;
  providerSubscriptionId?: string | null;
};

export function OrganizationBillingExemptPanel({
  organizationId,
  billingExempt,
  providerSubscriptionId = null,
}: OrganizationBillingExemptPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmExemptOpen, setConfirmExemptOpen] = useState(false);

  async function handleCancelStripe() {
    setBusy(true);
    setError(null);
    const result = await cancelStripeForBillingExemptOrganization(organizationId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleToggle(exempt: boolean) {
    setBusy(true);
    setError(null);
    const result = await setOrganizationBillingExempt({
      organizationId,
      exempt,
    });
    setBusy(false);
    setConfirmExemptOpen(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <section
        className={cn(
          RN_CARD_SHELL,
          "flex flex-col gap-4 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
        )}
      >
        <div>
          <h2 className="app-section-title">{t("adminLabels.billingExempt.title")}</h2>
          <p className="mt-2 app-text text-muted-foreground">
            {t("adminLabels.billingExempt.description")}
          </p>
          <p className="mt-3 text-app-sm font-semibold text-foreground">
            {billingExempt
              ? t("adminLabels.billingExempt.statusExempt")
              : t("adminLabels.billingExempt.statusBillable")}
          </p>
        </div>

        {billingExempt ? (
          <AdminActionButton
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void handleToggle(false)}
          >
            {busy
              ? t("adminLabels.billingExempt.removing")
              : t("adminLabels.billingExempt.removeExemption")}
          </AdminActionButton>
        ) : (
          <AdminActionButton
            type="button"
            variant="default"
            disabled={busy}
            onClick={() => setConfirmExemptOpen(true)}
          >
            {t("adminLabels.billingExempt.grantExemption")}
          </AdminActionButton>
        )}

        {billingExempt && providerSubscriptionId ? (
          <div className="space-y-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-4 py-3">
            <p className="text-app-sm text-muted-foreground">
              {t("adminLabels.billingExempt.cancelStripeHint")}
            </p>
            <AdminActionButton
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void handleCancelStripe()}
            >
              {busy
                ? t("adminLabels.billingExempt.cancelingStripe")
                : t("adminLabels.billingExempt.cancelStripe")}
            </AdminActionButton>
          </div>
        ) : null}

        {error ? (
          <p className="text-app-sm font-medium text-destructive">{error}</p>
        ) : null}
      </section>

      <AdminConfirmActionDialog
        open={confirmExemptOpen}
        onOpenChange={setConfirmExemptOpen}
        title={t("adminLabels.billingExempt.confirmTitle")}
        description={
          providerSubscriptionId
            ? t("adminLabels.billingExempt.confirmWithStripe")
            : t("adminLabels.billingExempt.confirmWithoutStripe")
        }
        confirmLabel={t("adminLabels.billingExempt.confirmButton")}
        busy={busy}
        onConfirm={() => void handleToggle(true)}
      />
    </>
  );
}
