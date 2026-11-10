"use client";

import { useTranslation } from "@/i18n/client";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Label } from "@/components/ui/label";
import { updateSubscriptionPeriod } from "@/lib/admin/actions/billing";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

type OrganizationSubscriptionPeriodFormProps = {
  organizationId: string;
  periodEnd: string | null;
  periodStart: string | null;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function OrganizationSubscriptionPeriodForm({
  organizationId,
  periodEnd,
  periodStart,
}: OrganizationSubscriptionPeriodFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [endDate, setEndDate] = useState(toDateInputValue(periodEnd));
  const [startDate, setStartDate] = useState(toDateInputValue(periodStart));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    const result = await updateSubscriptionPeriod({
      organizationId,
      periodEnd: endDate ? `${endDate}T23:59:59.999Z` : null,
      periodStart: startDate ? `${startDate}T00:00:00.000Z` : null,
    });

    setBusy(false);
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
        "flex flex-col gap-4 p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
      )}
    >
      <div>
        <h2 className="app-section-title">{t("adminLabels.sections.subscriptionPeriod")}</h2>
        <p className="mt-2 app-text text-muted-foreground">
          {t("admin.subscription_period_hint")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="period-start">{t("adminLabels.fields.periodStart")}</Label>
          <input
            id="period-start"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="flex h-12 w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-end">{t("adminLabels.fields.periodEnd")}</Label>
          <input
            id="period-end"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="flex h-12 w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
          />
        </div>
      </div>

      {error ? (
        <p className="text-app-sm font-medium text-destructive">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-app-sm font-medium text-success">{t("adminLabels.saved")}</p>
      ) : null}

      <AdminActionButton type="submit" variant="default" disabled={busy}>
        {busy ? t("admin.lagrer") : t("admin.lagre_periode")}
      </AdminActionButton>
    </form>
  );
}
