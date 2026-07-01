"use client";

import { useTranslation } from "@/i18n/client";
import { AdminPlanBadge, AdminStatusBadge } from "@/components/admin/admin-badges";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import {
  ADMIN_SETTABLE_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PLANS,
  type AdminSettableSubscriptionStatus,
  type SubscriptionPlan,
} from "@/constants/roles";
import { updateOrganizationSubscription } from "@/lib/admin/actions/organization-subscription";
import {
  subscriptionPlanLabel,
  subscriptionStatusLabel,
} from "@/lib/admin/subscription-labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type OrganizationSubscriptionFormProps = {
  organizationId: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
};

export function OrganizationSubscriptionForm({
  organizationId,
  subscriptionStatus,
  subscriptionPlan,
}: OrganizationSubscriptionFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState(subscriptionStatus);
  const [plan, setPlan] = useState(subscriptionPlan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const statusOptions = useMemo(
    () =>
      ADMIN_SETTABLE_SUBSCRIPTION_STATUSES.map((value) => ({
        value,
        label: subscriptionStatusLabel(value, t),
      })),
    [t],
  );
  const planOptions = useMemo(
    () =>
      SUBSCRIPTION_PLANS.map((value) => ({
        value,
        label: subscriptionPlanLabel(value, t),
      })),
    [t],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateOrganizationSubscription({
      organizationId,
      subscriptionStatus: status as AdminSettableSubscriptionStatus,
      subscriptionPlan: plan as SubscriptionPlan,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={cn(
        RN_CARD_SHELL,
        "flex flex-col gap-5 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
      )}
    >
      <div>
        <h2 className="app-section-title">{t("admin.abonnement")}</h2>
        <p className="mt-2 app-text text-muted-foreground">
          {t("admin.org_subscription_override_hint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminStatusBadge status={subscriptionStatus} />
          <AdminPlanBadge plan={subscriptionPlan} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subscription-status">{t("admin.status")}</Label>
          <FormSelect
            id="subscription-status"
            value={status}
            onValueChange={setStatus}
            options={statusOptions}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscription-plan">{t("admin.plan")}</Label>
          <FormSelect
            id="subscription-plan"
            value={plan}
            onValueChange={setPlan}
            options={planOptions}
          />
        </div>
      </div>

      {error ? (
        <p className="text-app-sm font-medium text-destructive">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-app-sm font-medium text-success">{t("adminLabels.saved")}</p>
      ) : null}

      <div>
        <AdminActionButton type="submit" variant="default" disabled={saving}>
          {saving ? t("admin.lagrer") : t("admin.lagre_abonnement")}
        </AdminActionButton>
      </div>
    </form>
  );
}
