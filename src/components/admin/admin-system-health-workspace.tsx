"use client";

import { useTranslation } from "@/i18n/client";
import { AdminLinkButton } from "@/components/admin/admin-action-button";
import {
  AdminHealthStatusBadge,
  overallStatusLabel,
} from "@/components/admin/admin-health-status-badge";
import { AdminQueuePanel } from "@/components/admin/admin-queue-panel";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { adminRoutes } from "@/config/admin-routes";
import {
  adminSubscriptionsHref,
  adminSupportHref,
} from "@/lib/admin/dashboard-links";
import type {
  HealthStatus,
  SystemHealthComponent,
  SystemHealthOverview,
} from "@/lib/admin/queries/system-health";
import { adminSettingsHref } from "@/lib/admin/settings-links";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import {
  Activity,
  CheckCircle2,
  LifeBuoy,
  Server,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

const tableHeadClass =
  "px-4 py-3 text-left text-app-sm font-semibold tracking-wider text-rn-text-column uppercase sm:px-6 sm:py-4 sm:text-app-base md:px-8 md:py-5";
const tableCellClass =
  "px-4 py-4 align-middle sm:px-6 sm:py-5 md:px-8 md:py-6";

function HealthKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  href,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  href?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  const { t } = useTranslation();
  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label min-w-0 break-words">{label}</span>
        <div className={cn(iconContainerClassName, "shrink-0")}>
          <Icon className={iconClassName} aria-hidden />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn("dashboard-kpi-value break-words", valueClassName)}>{value}</p>
        <p className="dashboard-kpi-caption mt-2 text-muted-foreground sm:mt-3">
          {caption}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          kpiTileClass,
          "group transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
        )}
      >
        {content}
        <span className="sr-only">{t("admin.overview_go_to", { label })}</span>
      </Link>
    );
  }

  return <div className={kpiTileClass}>{content}</div>;
}

function formatWebhookKpi(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 1) return "< 1 t";
  return `${Math.round(hours)} t siden`;
}

function overallStatusValueClass(status: HealthStatus): string {
  if (status === "critical") return "text-destructive";
  if (status === "warning") return "text-amber-800 dark:text-amber-300";
  if (status === "info") return "text-muted-foreground";
  return "text-success";
}

function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="app-section-title">{title}</h2>
      <p className="mt-1 app-text-secondary">{description}</p>
    </div>
  );
}

function InfrastructureComponentTile({
  component,
}: {
  component: SystemHealthComponent;
}) {
  return (
    <div className="flex h-full flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {component.href ? (
            <Link
              href={component.href}
              className="font-heading text-lg font-semibold text-success hover:underline"
            >
              {component.label}
            </Link>
          ) : (
            <h3 className="font-heading text-lg font-semibold">{component.label}</h3>
          )}
          <p className="mt-2 text-app-sm text-muted-foreground">{component.detail}</p>
        </div>
        <AdminHealthStatusBadge status={component.status} />
      </div>
    </div>
  );
}

export function AdminSystemHealthWorkspace({
  data,
}: {
  data: SystemHealthOverview;
}) {
  const { t, locale } = useTranslation();
  const componentHint =
    data.summary.warning + data.summary.critical > 0
      ? `${data.summary.warning} advarsel${data.summary.warning !== 1 ? "er" : ""}${
          data.summary.critical > 0
            ? ` · ${data.summary.critical} kritisk`
            : ""
        }`
      : t("admin.alle_komponenter_rapporterer_ok");

  const supportCaption =
    data.openSupportCount === 0
      ? t("admin.ingen_apne_saker")
      : t("admin.krever_oppfolging");

  const webhookCaption =
    data.lastWebhookHoursAgo == null
      ? t("admin.ingen_webhooks_registrert")
      : t("admin.siste_mottatte_stripe_hendelse");

  const overallIconContainer =
    data.overallStatus === "critical"
      ? "rounded-md bg-rn-danger-soft p-2"
      : data.overallStatus === "warning"
        ? "rounded-md bg-amber-500/10 p-2"
        : undefined;

  const overallIconClass =
    data.overallStatus === "critical"
      ? "size-6 text-rn-danger-ink"
      : data.overallStatus === "warning"
        ? "size-6 text-amber-800 dark:text-amber-300"
        : undefined;

  return (
    <div className="admin-page-workspace admin-system-health-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.systemhelse")}
            description={t("admin.overvakning_av_infrastruktur_bakgrunnsjobber_og_operative_si")}
            actions={
              <AdminLinkButton href={adminSettingsHref("integrations")}>{t("admin.integrasjoner")}</AdminLinkButton>
            }
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label={t("admin.nokkeltall")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <HealthKpiTile
              label={t("admin.samlet_status")}
              value={overallStatusLabel(data.overallStatus, t)}
              caption={t("admin.overview_monitored_components", {
                count: data.summary.total,
              })}
              icon={Activity}
              iconContainerClassName={overallIconContainer}
              iconClassName={overallIconClass}
              valueClassName={overallStatusValueClass(data.overallStatus)}
            />
            <HealthKpiTile
              label={t("admin.komponenter_ok")}
              value={`${data.summary.healthy}/${data.summary.total}`}
              caption={componentHint}
              icon={CheckCircle2}
              valueClassName={
                data.summary.warning + data.summary.critical > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success"
              }
            />
            <HealthKpiTile
              label={t("admin.apne_support_saker")}
              value={data.openSupportCount}
              caption={supportCaption}
              icon={LifeBuoy}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName={
                data.openSupportCount > 0 ? "text-destructive" : "text-success"
              }
              href={adminSupportHref("open")}
            />
            <HealthKpiTile
              label={t("admin.siste_stripe_webhook")}
              value={formatWebhookKpi(data.lastWebhookHoursAgo)}
              caption={webhookCaption}
              icon={Webhook}
              href={adminSettingsHref("integrations")}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title={t("admin.infrastruktur")}
            description={t("admin.tilstand_for_database_autentisering_betaling_og_planlagte_jo")}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
            {data.components.map((component) => (
              <InfrastructureComponentTile
                key={component.id}
                component={component}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-8">
        <SectionIntro
          title={t("admin.krever_oppmerksomhet")}
          description={t("admin.operative_koer_som_kan_trenge_oppfolging")}
        />
        <div
          className={
            data.failedJobQueue.length > 0
              ? "grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3"
              : "grid grid-cols-1 gap-8 lg:grid-cols-2"
          }
        >
          <AdminQueuePanel
            title={t("admin.apne_support_saker")}
            items={data.openSupportQueue}
            emptyLabel={t("admin.ingen_apne_support_saker")}
            viewAllHref={adminSupportHref("open")}
          />
          <AdminQueuePanel
            title={t("admin.forfalt_betaling")}
            items={data.failedPaymentQueue}
            emptyLabel={t("admin.ingen_organisasjoner_med_forfalt_status")}
            viewAllHref={adminSubscriptionsHref("past_due")}
          />
          {data.failedJobQueue.length > 0 ? (
            <AdminQueuePanel
              title={t("admin.feilede_bakgrunnsjobber_7_d")}
              items={data.failedJobQueue}
              emptyLabel={t("admin.ingen_feilede_jobber")}
              viewAllHref={adminRoutes.systemHealth}
            />
          ) : null}
        </div>
      </section>

      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <section className="px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title={t("admin.hendelseslogg")}
            description={t("admin.siste_stripe_webhooks_og_bakgrunnsjobber")}
          />
        </section>

        <div className="grid border-t border-rn-border-strong/50 lg:grid-cols-2">
          <div className="border-rn-border-strong/50 lg:border-r">
            <div className="flex items-center gap-2 border-b-2 border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8 md:py-5">
              <Server className="size-5 text-primary dark:text-white" aria-hidden />
              <h3 className="app-section-title">{t("adminLabels.sections.stripeWebhooks")}</h3>
            </div>
            <div className="app-table -mx-px max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[320px] text-left text-app-base">
                <thead>
                  <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                    <th className={tableHeadClass}>{t("adminLabels.fields.event")}</th>
                    <th className={tableHeadClass}>{t("adminLabels.fields.type")}</th>
                    <th className={tableHeadClass}>{t("adminLabels.fields.timestamp")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rn-border-strong/50">
                  {data.recentWebhooks.map((event) => (
                    <tr
                      key={event.eventId}
                      className="transition-colors hover:bg-rn-surface-row-hover"
                    >
                      <td className={cn(tableCellClass, "font-mono text-app-xs")}>
                        {event.eventId.slice(0, 12)}…
                      </td>
                      <td className={tableCellClass}>{event.eventType}</td>
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {event.processedAt
                          ? format(new Date(event.processedAt), "d. MMM yyyy HH:mm", {
                              locale: getDateFnsLocale(locale),
                            })
                          : t("admin.venter")}
                      </td>
                    </tr>
                  ))}
                  {data.recentWebhooks.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="px-6 py-12 text-center app-text-muted md:px-8">
                          {t("adminLabels.empty.noWebhooks")}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 border-b-2 border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8 md:py-5">
              <Activity className="size-5 text-primary dark:text-white" aria-hidden />
              <h3 className="app-section-title">{t("adminLabels.sections.backgroundJobs")}</h3>
            </div>
            <div className="app-table -mx-px max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[320px] text-left text-app-base">
                <thead>
                  <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                    <th className={tableHeadClass}>{t("adminLabels.fields.job")}</th>
                    <th className={tableHeadClass}>{t("admin.status")}</th>
                    <th className={tableHeadClass}>{t("adminLabels.fields.completed")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rn-border-strong/50">
                  {data.recentJobRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="transition-colors hover:bg-rn-surface-row-hover"
                    >
                      <td className={tableCellClass}>
                        <span className="font-medium">{run.jobName}</span>
                        {run.metadataSummary ? (
                          <p className="mt-1 text-app-xs text-muted-foreground">
                            {run.metadataSummary}
                          </p>
                        ) : null}
                      </td>
                      <td className={tableCellClass}>{run.status}</td>
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {run.finishedAt
                          ? format(new Date(run.finishedAt), "d. MMM yyyy HH:mm", {
                              locale: getDateFnsLocale(locale),
                            })
                          : t("admin.pagar")}
                      </td>
                    </tr>
                  ))}
                  {data.recentJobRuns.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="px-6 py-12 text-center app-text-muted md:px-8">
                          {t("adminLabels.empty.noJobRuns")}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          Miljøvariabler, integrasjoner og plattformadministratorer finnes under{" "}
          <Link
            href={adminSettingsHref("integrations")}
            className="font-semibold text-success hover:underline"
          >{t("admin.plattforminnstillinger")}</Link>
          . Live komponentstatus og hendelseslogg oppdateres ved sideinnlasting.
        </p>
      </div>
    </div>
  );
}
