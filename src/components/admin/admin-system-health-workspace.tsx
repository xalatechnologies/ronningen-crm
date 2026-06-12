"use client";

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
import { nb } from "date-fns/locale";
import {
  Activity,
  CheckCircle2,
  LifeBuoy,
  Server,
  Webhook,
} from "lucide-react";
import Link from "next/link";

const tableHeadClass =
  "px-6 py-4 text-left text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

const kpiTileClass =
  "flex h-full w-full flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 text-left shadow-sm transition-colors hover:border-success/35 hover:bg-rn-surface-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 sm:p-6";

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

function HealthKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  iconClassName,
  valueClassName,
  href,
}: {
  label: string;
  value: string | number;
  caption?: string;
  icon: typeof Activity;
  iconClassName?: string;
  valueClassName?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="dashboard-kpi-label">{label}</span>
        <div className={cn("rounded-md p-2", iconClassName ?? "bg-accent")}>
          <Icon className="size-6 text-primary" aria-hidden />
        </div>
      </div>
      <div>
        <p className={cn("dashboard-kpi-value", valueClassName ?? "text-success")}>
          {value}
        </p>
        {caption ? (
          <p className="dashboard-kpi-caption mt-3 text-muted-foreground">{caption}</p>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={kpiTileClass}>
        {body}
        <span className="sr-only">Gå til {label}</span>
      </Link>
    );
  }

  return <div className={kpiTileClass}>{body}</div>;
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
  const componentHint =
    data.summary.warning + data.summary.critical > 0
      ? `${data.summary.warning} advarsel${data.summary.warning !== 1 ? "er" : ""}${
          data.summary.critical > 0
            ? ` · ${data.summary.critical} kritisk`
            : ""
        }`
      : "Alle komponenter rapporterer OK";

  const supportCaption =
    data.openSupportCount === 0
      ? "Ingen åpne saker"
      : "Krever oppfølging";

  const webhookCaption =
    data.lastWebhookHoursAgo == null
      ? "Ingen webhooks registrert"
      : "Siste mottatte Stripe-hendelse";

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col gap-8 pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Systemhelse"
            description="Overvåkning av infrastruktur, bakgrunnsjobber og operative signaler."
            actions={
              <AdminLinkButton href={adminSettingsHref("integrations")}>
                Integrasjoner
              </AdminLinkButton>
            }
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <HealthKpiTile
              label="Samlet status"
              value={overallStatusLabel(data.overallStatus)}
              caption={`${data.summary.total} overvåkede komponenter`}
              icon={Activity}
              iconClassName={
                data.overallStatus === "critical"
                  ? "bg-rn-danger-soft"
                  : data.overallStatus === "warning"
                    ? "bg-amber-500/10"
                    : undefined
              }
              valueClassName={overallStatusValueClass(data.overallStatus)}
            />
            <HealthKpiTile
              label="Komponenter OK"
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
              label="Åpne support-saker"
              value={data.openSupportCount}
              caption={supportCaption}
              icon={LifeBuoy}
              iconClassName="bg-rn-danger-soft"
              valueClassName={
                data.openSupportCount > 0 ? "text-destructive" : "text-success"
              }
              href={adminSupportHref("open")}
            />
            <HealthKpiTile
              label="Siste Stripe-webhook"
              value={formatWebhookKpi(data.lastWebhookHoursAgo)}
              caption={webhookCaption}
              icon={Webhook}
              href={adminSettingsHref("integrations")}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title="Infrastruktur"
            description="Tilstand for database, autentisering, betaling og planlagte jobber."
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

      <section className="flex flex-col gap-app-gap">
        <SectionIntro
          title="Krever oppmerksomhet"
          description="Operative køer som kan trenge oppfølging."
        />
        <div
          className={
            data.failedJobQueue.length > 0
              ? "grid gap-app-gap lg:grid-cols-2 xl:grid-cols-3"
              : "grid gap-app-gap lg:grid-cols-2"
          }
        >
          <AdminQueuePanel
            title="Åpne support-saker"
            items={data.openSupportQueue}
            emptyLabel="Ingen åpne support-saker."
            viewAllHref={adminSupportHref("open")}
          />
          <AdminQueuePanel
            title="Forfalt betaling"
            items={data.failedPaymentQueue}
            emptyLabel="Ingen organisasjoner med forfalt status."
            viewAllHref={adminSubscriptionsHref("past_due")}
          />
          {data.failedJobQueue.length > 0 ? (
            <AdminQueuePanel
              title="Feilede bakgrunnsjobber (7 d.)"
              items={data.failedJobQueue}
              emptyLabel="Ingen feilede jobber."
              viewAllHref={adminRoutes.systemHealth}
            />
          ) : null}
        </div>
      </section>

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <section className="px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8">
          <SectionIntro
            title="Hendelseslogg"
            description="Siste Stripe-webhooks og bakgrunnsjobber."
          />
        </section>

        <div className="grid border-t border-rn-border-strong/50 lg:grid-cols-2">
          <div className="border-rn-border-strong/50 lg:border-r">
            <div className="flex items-center gap-2 border-b border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
              <Server className="size-5 text-primary" aria-hidden />
              <h3 className="app-section-title">Stripe-webhooks</h3>
            </div>
            <div className="app-table overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-app-base">
                <thead>
                  <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                    <th className={tableHeadClass}>Hendelse</th>
                    <th className={tableHeadClass}>Type</th>
                    <th className={tableHeadClass}>Tidspunkt</th>
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
                              locale: nb,
                            })
                          : "Venter"}
                      </td>
                    </tr>
                  ))}
                  {data.recentWebhooks.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="px-6 py-12 text-center app-text-muted md:px-8">
                          Ingen webhooks registrert.
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 border-b border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
              <Activity className="size-5 text-primary" aria-hidden />
              <h3 className="app-section-title">Bakgrunnsjobber</h3>
            </div>
            <div className="app-table overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-app-base">
                <thead>
                  <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                    <th className={tableHeadClass}>Jobb</th>
                    <th className={tableHeadClass}>Status</th>
                    <th className={tableHeadClass}>Fullført</th>
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
                              locale: nb,
                            })
                          : "Pågår"}
                      </td>
                    </tr>
                  ))}
                  {data.recentJobRuns.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="px-6 py-12 text-center app-text-muted md:px-8">
                          Ingen jobbkjøringer registrert ennå.
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
          >
            Plattforminnstillinger
          </Link>
          . Live komponentstatus og hendelseslogg oppdateres ved sideinnlasting.
        </p>
      </div>
    </div>
  );
}
