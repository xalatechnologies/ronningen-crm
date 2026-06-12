"use client";

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
import { nb } from "date-fns/locale";
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
      toast.error("Kunne ikke lagre", { description: result.error });
      return;
    }

    toast.success("Innstillinger lagret");
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
      toast.error("Kunne ikke fjerne unntak", { description: result.error });
      return;
    }

    toast.success("Org-unntak fjernet");
    onUpdated();
  }

  async function handleAddOverride() {
    const orgId = newOrgId.trim();
    if (!orgId) {
      toast.error("Angi organisasjons-ID");
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
      toast.error("Kunne ikke legge til unntak", { description: result.error });
      return;
    }

    setNewOrgId("");
    toast.success("Org-unntak lagt til");
    onUpdated();
  }

  const overrideEntries = Object.entries(flag.organizationOverrides);

  return (
    <div className="space-y-6 p-1">
      {flag.key === "billing_enabled" && billingEnvEnabled && !flag.enabledGlobal ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-app-sm text-amber-900 dark:text-amber-200">
          Miljøvariabel aktiverer fakturering uavhengig av dette flagget (
          <code className="font-mono text-app-xs">BILLING_ENABLED</code>).
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-app-sm font-semibold text-foreground">Global utrulling</h3>
        <div className="flex flex-wrap items-center gap-3">
          <p className="app-text-secondary">
            Status: <span className="font-semibold text-foreground">{status}</span>
            {flag.enabledGlobal ? " (på for alle)" : " (av globalt)"}
          </p>
          <AdminActionButton
            type="button"
            disabled={busy || saving}
            variant={flag.enabledGlobal ? "destructive" : "default"}
            onClick={() => onRequestGlobalToggle(!flag.enabledGlobal)}
          >
            {flag.enabledGlobal ? "Deaktiver globalt" : "Aktiver globalt"}
          </AdminActionButton>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-app-sm font-semibold text-foreground">Gradvis utrulling</h3>
        <p className="app-text-muted">
          Når globalt er av, får omtrent {rollout} % av organisasjonene funksjonen
          basert på stabil hash per org.
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
            aria-label="Utrullingsprosent"
          />
          <span className="w-12 text-right font-mono text-app-sm tabular-nums">
            {rollout}%
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-app-sm font-semibold text-foreground">Planlagt aktivering</h3>
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerField
            value={scheduledDate}
            onChange={setScheduledDate}
            className="w-[10.5rem]"
            variant="toolbar"
            disabled={saving}
            aria-label="Planlagt aktiveringsdato"
          />
          <AdminActionButton
            type="button"
            variant="outline"
            disabled={saving || !scheduledDate}
            onClick={() => setScheduledDate("")}
          >
            Fjern dato
          </AdminActionButton>
        </div>
        <p className="app-text-muted">
          Tom dato betyr umiddelbar aktivering når flagget ellers er på.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <AdminActionButton
          type="button"
          disabled={!settingsDirty || saving}
          onClick={() => void handleSaveSettings()}
        >
          {saving ? "Lagrer…" : "Lagre endringer"}
        </AdminActionButton>
      </div>

      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="text-app-sm font-semibold text-foreground">Org-unntak</h3>
        {overrideEntries.length === 0 ? (
          <p className="app-text-muted">Ingen organisasjonsunntak.</p>
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
                    {orgNames[orgId] ?? "Ukjent organisasjon"}
                  </Link>
                  <p className="font-mono text-app-xs text-muted-foreground">{orgId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-app-sm font-medium">
                    {enabled ? "På" : "Av"}
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
              Organisasjons-ID
            </label>
            <Input
              value={newOrgId}
              onChange={(event) => setNewOrgId(event.target.value)}
              placeholder="UUID for organisasjon"
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
                { value: "true", label: "På" },
                { value: "false", label: "Av" },
              ]}
              aria-label="Unntaksverdi"
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
          <span className="font-medium text-foreground">Nøkkel: </span>
          <code className="font-mono text-app-xs">{flag.key}</code>
        </p>
        <p>
          Sist endret:{" "}
          {format(new Date(flag.updatedAt), "d. MMM yyyy HH:mm", { locale: nb })}
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
            Se i revisjonslogg
          </Link>
        </p>
      </section>
    </div>
  );
}
