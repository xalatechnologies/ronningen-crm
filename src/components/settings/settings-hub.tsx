"use client";

import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";
import { useTranslation } from "@/i18n/client";
import {
  roleLabel,
  settingsSectionDescription,
  settingsSectionTitle,
  statusLabel,
} from "@/lib/navigation/nav-labels";
import { visibleSettingsSections } from "@/lib/settings/settings-links";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type SettingsHubProps = {
  propertyCount: number;
  teamCount: number;
};

export function SettingsHub({ propertyCount, teamCount }: SettingsHubProps) {
  const { t } = useTranslation();
  const { currentOrganization, loading } = useCurrentOrganization();
  const { role } = useOrganizationPermissions();
  const sections = visibleSettingsSections(role).filter((s) => s.id !== "overview");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="app-title">{t("settings.hubTitle")}</h1>
        {loading ? (
          <p className="mt-2 text-muted-foreground">{t("settings.loadingOrg")}</p>
        ) : currentOrganization ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border-2 border-rn-border-strong bg-card px-3 py-1 text-sm font-semibold text-foreground">
              {currentOrganization.name}
            </span>
            {role ? (
              <span className="rounded-md border-2 border-rn-accent-border/50 bg-rn-surface-gradient-from px-3 py-1 text-sm font-semibold text-success dark:!text-white">
                {roleLabel(role, t)}
              </span>
            ) : null}
            <span className="rounded-md border-2 border-rn-border-strong/60 bg-muted/30 px-3 py-1 text-sm text-muted-foreground">
              {statusLabel(currentOrganization.subscriptionStatus, t)}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">{t("settings.noActiveOrg")}</p>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className={cn("px-4 py-3", RN_CARD_SHELL)}>
          <dt className="text-sm text-muted-foreground">{t("settings.venues")}</dt>
          <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
            {propertyCount}
          </dd>
        </div>
        <div className={cn("px-4 py-3", RN_CARD_SHELL)}>
          <dt className="text-sm text-muted-foreground">{t("settings.teamMembers")}</dt>
          <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">
            {teamCount}
          </dd>
        </div>
        <div className={cn("px-4 py-3", RN_CARD_SHELL)}>
          <dt className="text-sm text-muted-foreground">{t("settings.plan")}</dt>
          <dd className="mt-1 font-heading text-lg font-bold capitalize">
            {currentOrganization?.subscriptionPlan ?? "—"}
          </dd>
        </div>
      </dl>

      <ul className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ href, id, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-rn-surface-row-hover md:p-8",
                RN_CARD_SHELL,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md border-2 border-rn-accent-border bg-rn-surface-gradient-from text-success dark:!text-white">
                  <Icon className="size-6" aria-hidden />
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  aria-hidden
                />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-rn-text-heading">
                  {settingsSectionTitle(id, t)}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {settingsSectionDescription(id, t)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
