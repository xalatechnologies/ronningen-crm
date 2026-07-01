"use client";

import { useTranslation } from "@/i18n/client";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { adminRoutes } from "@/config/admin-routes";
import { updateFeatureFlag } from "@/lib/admin/actions/feature-flags";
import { adminAuditHref } from "@/lib/admin/dashboard-links";
import { resolveFeatureFlagStatus } from "@/lib/admin/feature-flag-status";
import type { AdminFeatureFlag } from "@/lib/admin/queries/feature-flags";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toEnabledAtIso(dateYmd: string): string | null {
  if (!dateYmd) return null;
  return `${dateYmd}T00:00:00.000Z`;
}

type FeatureFlagDetailPanelProps = {
  flag: AdminFeatureFlag;
  orgNames: Record<string, string>;
  billingEnvEnabled: boolean;
  busy: boolean;
  onRequestGlobalToggle: (enabled: boolean) => void;
  onUpdated: () => void;
};

export function FeatureFlagDetailPanel({
  flag,
  orgNames,
  billingEnvEnabled,
  busy,
  onRequestGlobalToggle,
  onUpdated,
}: FeatureFlagDetailPanelProps) {
  const { t, locale } = useTranslation();
  const [rollout, setRollout] = useState(flag.rolloutPercentage);
  const [scheduledDate, setScheduledDate] = useState(toDateInputValue(flag.enabledAt));
  const [newOrgId, setNewOrgId] = useState("");
  const [newOrgEnabled, setNewOrgEnabled] = useState("true");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRollout(flag.rolloutPercentage);
    setScheduledDate(toDateInputValue(flag.enabledAt));
  }, [flag.key, flag.rolloutPercentage, flag.enabledAt]);

  const status = resolveFeatureFlagStatus(flag);
  const settingsDirty =
    (!flag.enabledGlobal && rollout !== flag.rolloutPercentage) ||
    scheduledDate !== toDateInputValue(flag.enabledAt);

  async function handleSaveSettings() {
    setSaving(true);
    const result = await updateFeatureFlag({
      key: flag.key,
      rolloutPercentage: flag.enabledGlobal ? undefined : rollout,
      enabledAt: toEnabledAtIso(scheduledDate),
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_lagre"), { description: result.error });
      return;
    }

    toast.success(t("admin.innstillinger_lagret"));
    onUpdated();
  }

  async function handleRemoveOverride(orgId: string) {
    const nextOverrides = { ...flag.organizationOverrides };
    delete nextOverrides[orgId];

    setSaving(true);
    const result = await updateFeatureFlag({
      key: flag.key,
      organizationOverrides: nextOverrides,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_fjerne_unntak"), { description: result.error });
      return;
    }

    toast.success(t("admin.org_unntak_fjernet"));
    onUpdated();
  }

  async function handleAddOverride() {
    const orgId = newOrgId.trim();
    if (!orgId) {
      toast.error(t("admin.angi_organisasjons_id"));
      return;
    }

    const nextOverrides = {
      ...flag.organizationOverrides,
      [orgId]: newOrgEnabled === "true",
    };

    setSaving(true);
    const result = await updateFeatureFlag({
      key: flag.key,
      organizationOverrides: nextOverrides,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_legge_til_unntak"), { description: result.error });
      return;
    }

    setNewOrgId("");
    toast.success(t("admin.org_unntak_lagt_til"));
    onUpdated();
  }

  const overrideEntries = Object.entries(flag.organizationOverrides);

  return (
    <div className="space-y-6 p-1">
      {flag.key === "billing_enabled" && billingEnvEnabled && !flag.enabledGlobal ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-app-sm text-amber-900 dark:text-amber-200">
          {t("adminLabels.billingFlagHint")}
          <code className="font-mono text-app-xs">BILLING_ENABLED</code>).
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-app-sm font-semibold text-foreground">{t("adminLabels.sections.globalRollout")}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <p className="app-text-secondary">
            {t("admin.feature_flag_status_label")}{" "}
            <span className="font-semibold text-foreground">{status}</span>
            {flag.enabledGlobal ? t("admin.feature_flag_on_for_all") : t("admin.feature_flag_off_globally")}
          </p>
          <AdminActionButton
            type="button"
            disabled={busy || saving}
            variant={flag.enabledGlobal ? "destructive" : "default"}
            onClick={() => onRequestGlobalToggle(!flag.enabledGlobal)}
          >
            {flag.enabledGlobal ? t("admin.deaktiver_globalt") : t("admin.aktiver_globalt")}
          </AdminActionButton>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-app-sm font-semibold text-foreground">{t("admin.gradvis_utrulling")}</h3>
        <p className="app-text-muted">
          {t("admin.feature_flag_rollout_hint", { rollout })}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={rollout}
            disabled={flag.enabledGlobal || saving}
            onChange={(event) => setRollout(Number(event.target.value))}
            className="h-2 min-w-[12rem] flex-1 accent-success disabled:opacity-50"
            aria-label={t("admin.utrullingsprosent")}
          />
          <span className="w-12 text-right font-mono text-app-sm tabular-nums">
            {rollout}%
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-app-sm font-semibold text-foreground">{t("adminLabels.sections.scheduledActivation")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerField
            value={scheduledDate}
            onChange={setScheduledDate}
            className="w-[10.5rem]"
            variant="toolbar"
            disabled={saving}
            aria-label={t("admin.planlagt_aktiveringsdato")}
          />
          <AdminActionButton
            type="button"
            variant="outline"
            disabled={saving || !scheduledDate}
            onClick={() => setScheduledDate("")}
          >
            {t("admin.fjern_dato")}
          </AdminActionButton>
        </div>
        <p className="app-text-muted">
          {t("admin.feature_flag_immediate_activation")}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <AdminActionButton
          type="button"
          disabled={!settingsDirty || saving}
          onClick={() => void handleSaveSettings()}
        >
          {saving ? t("admin.lagrer") : t("admin.lagre_endringer")}
        </AdminActionButton>
      </div>

      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="text-app-sm font-semibold text-foreground">{t("admin.org_unntak")}</h3>
        {overrideEntries.length === 0 ? (
          <p className="app-text-muted">{t("adminLabels.empty.noOrgExceptions")}</p>
        ) : (
          <ul className="space-y-2">
            {overrideEntries.map(([orgId, enabled]) => (
              <li
                key={orgId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rn-border-strong/60 bg-muted/20 px-3 py-2"
              >
                <div>
                  <Link
                    href={adminRoutes.organizationDetail(orgId)}
                    className="font-heading font-semibold text-success hover:underline"
                  >
                    {orgNames[orgId] ?? t("admin.ukjent_organisasjon")}
                  </Link>
                  <p className="font-mono text-app-xs text-muted-foreground">{orgId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-app-sm font-medium">
                    {enabled ? t("admin.feature_flag_on") : t("admin.feature_flag_off")}
                  </span>
                  <AdminActionButton
                    type="button"
                    variant="outline"
                    disabled={busy || saving}
                    onClick={() => void handleRemoveOverride(orgId)}
                  >
                    Fjern
                  </AdminActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <label className="mb-1.5 block text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("adminLabels.fields.organizationId")}
            </label>
            <Input
              value={newOrgId}
              onChange={(event) => setNewOrgId(event.target.value)}
              placeholder={t("admin.uuid_for_organisasjon")}
              className="border-2 border-rn-border-strong font-mono text-app-sm"
            />
          </div>
          <div className="min-w-[8rem]">
            <label className="mb-1.5 block text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verdi
            </label>
            <FormSelect
              value={newOrgEnabled}
              onValueChange={setNewOrgEnabled}
              options={[
                { value: "true", label: t("admin.feature_flag_on") },
                { value: "false", label: t("admin.feature_flag_off") },
              ]}
              aria-label={t("admin.unntaksverdi")}
            />
          </div>
          <AdminActionButton
            type="button"
            disabled={busy || saving}
            onClick={() => void handleAddOverride()}
          >
            Legg til
          </AdminActionButton>
        </div>
      </section>

      <section className="space-y-1 border-t border-border pt-4 app-text-muted">
        <p>
          <span className="font-medium text-foreground">{t("adminLabels.fields.key")}: </span>
          <code className="font-mono text-app-xs">{flag.key}</code>
        </p>
        <p>
          {t("adminLabels.meta.lastChangedAt", {
            date: format(new Date(flag.updatedAt), "d. MMM yyyy HH:mm", {
              locale: getDateFnsLocale(locale),
            }),
          })}
        </p>
        <p>
          <Link
            href={adminAuditHref({
              category: "platform",
              action: "feature_flag.updated",
              q: flag.key,
            })}
            className="font-semibold text-success hover:underline"
          >
            {t("admin.se_i_revisjonslogg")}
          </Link>
        </p>
      </section>
    </div>
  );
}
