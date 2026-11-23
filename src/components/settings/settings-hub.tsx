"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getBillingPlan } from "@/config/billing-plans";
import { SetupProgressCard } from "@/features/settings/components/setup-progress-card";
import type { SetupProgress } from "@/features/settings/lib/setup-progress";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { useTranslation } from "@/i18n/client";
import type { TranslationKey } from "@/i18n/types";
import { roleLabel, settingsSectionDescription, settingsSectionTitle, statusLabel } from "@/lib/navigation/nav-labels";
import { visibleSettingsSections } from "@/lib/settings/settings-links";

type SettingsHubProps = {
  propertyCount: number;
  teamCount: number;
  /** Setup checklist for owners and admins; null for everyone else. */
  setup: SetupProgress | null;
};

/** Which setup steps a settings section covers. A section is "complete" when all its steps are done. */
const SECTION_SETUP_STEPS: Record<string, readonly string[]> = {
  organization: ["organization"],
  lokaler: ["lokaler"],
  team: ["team"],
  billing: ["billing"],
  integrations: ["calendar"],
  contracts: ["contract", "portal"],
};

/** The sections, grouped by what they are about. A group with no visible section is not shown. */
const SETTINGS_GROUPS: readonly { id: "business" | "agreements" | "account"; sections: readonly string[] }[] = [
  { id: "business", sections: ["organization", "lokaler", "team"] },
  { id: "agreements", sections: ["contracts", "billing", "integrations"] },
  { id: "account", sections: ["activity", "support", "account"] },
];

export function SettingsHub({ propertyCount, teamCount, setup }: SettingsHubProps) {
  const { t } = useTranslation();
  const { currentOrganization, loading } = useCurrentOrganization();
  const { role } = useOrganizationPermissions();
  const sections = visibleSettingsSections(role).filter((s) => s.id !== "overview");

  const planName = currentOrganization
    ? (getBillingPlan(currentOrganization.subscriptionPlan)?.name ?? currentOrganization.subscriptionPlan)
    : "—";
  const summary = [
    { label: t("settings.venues"), value: String(propertyCount) },
    { label: t("settings.teamMembers"), value: String(teamCount) },
    { label: t("settings.plan"), value: planName },
  ];

  function stepsDone(id: string): boolean | null {
    const steps = SECTION_SETUP_STEPS[id];
    if (!setup || !steps) return null;
    return steps.every((step) => setup.items.find((item) => item.id === step)?.done);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="app-title">{t("settings.hubTitle")}</h1>
        {loading ? (
          <p className="text-muted-foreground">{t("settings.loadingOrg")}</p>
        ) : currentOrganization ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-app-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{currentOrganization.name}</span>
            {role ? <span aria-hidden>·</span> : null}
            {role ? <span>{roleLabel(role, t)}</span> : null}
            <span aria-hidden>·</span>
            <span>{statusLabel(currentOrganization.subscriptionStatus, t)}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">{t("settings.noActiveOrg")}</p>
        )}
      </div>

      {setup ? <SetupProgressCard progress={setup} /> : null}

      <dl className="grid grid-cols-3 divide-x divide-foreground/8 rounded-2xl bg-card py-3.5 ring-1 ring-foreground/8">
        {summary.map(({ label, value }) => (
          <div key={label} className="px-4 sm:px-5">
            <dt className="text-app-xs font-semibold text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate font-heading text-lg font-bold text-rn-text-heading tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {SETTINGS_GROUPS.map((group) => {
        const rows = group.sections.flatMap((id) => sections.filter((s) => s.id === id));
        if (rows.length === 0) return null;
        return (
          <section key={group.id} aria-labelledby={`settings-group-${group.id}`} className="flex flex-col gap-2">
            <h2 id={`settings-group-${group.id}`} className="px-1 text-app-xs font-bold tracking-wide text-muted-foreground uppercase">
              {t(`settings.groups.${group.id}` as TranslationKey)}
            </h2>
            <ul className="divide-y divide-foreground/8 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8">
              {rows.map(({ href, id, icon: Icon }) => {
                const done = stepsDone(id);
                return (
                  <li key={href}>
                    <Link href={href} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success dark:!text-white">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-app-base font-semibold text-rn-text-heading">{settingsSectionTitle(id, t)}</span>
                        <span className="block text-app-sm text-muted-foreground sm:truncate">{settingsSectionDescription(id, t)}</span>
                      </span>
                      {done === false ? <StatusBadge tone="warning">{t("settings.progress.statusMissing")}</StatusBadge> : null}
                      {done === true ? (
                        <span
                          role="img"
                          aria-label={t("settings.progress.statusDone")}
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success-text"
                        >
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                      ) : null}
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
