"use client";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import {
  AdminNotificationFilterBar,
  type AdminCampaignFilter,
  type AdminDeliveryFilter,
  type AdminNotificationView,
} from "@/components/admin/admin-notification-filters";
import { NotificationCampaignDetailPanel } from "@/components/admin/notification-campaign-detail-panel";
import { NotificationTemplateDetailPanel } from "@/components/admin/notification-template-detail-panel";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { FormSelect, toIdNameOptions } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRoutes } from "@/config/admin-routes";
import {
  createNotificationCampaign,
  sendNotificationCampaign,
  updateCampaignStatus,
  upsertEmailTemplate,
} from "@/lib/admin/actions/notifications";
import { adminNotificationsHref } from "@/lib/admin/dashboard-links";
import {
  computeCampaignFilterCounts,
  computeNotificationViewCounts,
  matchesCampaignFilter,
  matchesDeliveryFilter,
  matchesTemplateSearch,
  type AdminNotificationOverviewStats,
} from "@/lib/admin/notification-filters";
import {
  CAMPAIGN_SETTABLE_STATUSES,
  formatCampaignStatusLabel,
  formatDeliveryStatusLabel,
  type CampaignStatus,
} from "@/lib/admin/notification-labels";
import type {
  AdminEmailTemplate,
  AdminNotificationCampaign,
  AdminNotificationDelivery,
} from "@/lib/admin/queries/notifications";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Mail,
  MailCheck,
  MailX,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const tableHeadClass =
  "px-6 py-4 text-left text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

const kpiTileClass =
  "flex w-full flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 text-left shadow-sm transition-colors hover:border-success/35 hover:bg-rn-surface-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 sm:p-6";

function NotificationKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  iconClassName,
  valueClassName,
  active,
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: typeof Bell;
  iconClassName?: string;
  valueClassName?: string;
  active?: boolean;
  href?: string;
  onClick?: () => void;
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
        <p className="dashboard-kpi-caption mt-3 text-muted-foreground">{caption}</p>
      </div>
    </>
  );

  const className = cn(kpiTileClass, active && "border-success/50 bg-rn-surface-gradient-from/40");

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
        <span className="sr-only">Gå til {label}</span>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-pressed={active ? "true" : "false"}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

function campaignStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "border-success/40 bg-success/10 text-success";
    case "paused":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    default:
      return "border-rn-border-strong bg-muted/30 text-muted-foreground";
  }
}

function deliveryStatusBadgeClass(status: string): string {
  switch (status) {
    case "failed":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "opened":
      return "border-success/40 bg-success/10 text-success";
    case "delivered":
      return "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300";
    default:
      return "border-rn-border-strong bg-muted/30 text-muted-foreground";
  }
}

const CAMPAIGN_STATUS_OPTIONS = CAMPAIGN_SETTABLE_STATUSES.map((value) => ({
  value,
  label: formatCampaignStatusLabel(value),
}));

function CampaignSendButton({
  campaign,
  onSent,
}: {
  campaign: AdminNotificationCampaign;
  onSent: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (campaign.status !== "active" || !campaign.templateKey) {
    return null;
  }

  async function handleSend() {
    setBusy(true);
    const result = await sendNotificationCampaign({ campaignId: campaign.id });
    setBusy(false);
    setConfirmOpen(false);

    if (!result.ok) {
      toast.error("Kunne ikke sende kampanje", { description: result.error });
      return;
    }

    toast.success(
      `Sendt til ${result.sent} mottakere (${result.failed} feilet, ${result.skipped} hoppet over)`,
    );
    onSent();
  }

  return (
    <>
      <AdminActionButton
        type="button"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
      >
        Send til alle
      </AdminActionButton>
      <AdminConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send kampanje til alle brukere?"
        description={
          <>
            Kampanjen <strong>{campaign.name}</strong> sendes til alle brukere
            med gyldig e-post. Dette kan ikke angres, men hver bruker mottar
            maks én e-post per kampanje.
          </>
        }
        confirmLabel="Send nå"
        busy={busy}
        onConfirm={() => void handleSend()}
      />
    </>
  );
}

function CampaignStatusSelect({
  campaign,
  onUpdated,
}: {
  campaign: AdminNotificationCampaign;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleChange(nextStatus: string) {
    if (!nextStatus || nextStatus === campaign.status) return;

    setBusy(true);
    const result = await updateCampaignStatus({
      campaignId: campaign.id,
      status: nextStatus as CampaignStatus,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error("Kunne ikke oppdatere status", { description: result.error });
      return;
    }

    toast.success("Kampanjestatus oppdatert");
    onUpdated();
  }

  return (
    <FormSelect
      value={campaign.status}
      onValueChange={(value) => void handleChange(value)}
      options={CAMPAIGN_STATUS_OPTIONS}
      disabled={busy}
      className="admin-table-select min-w-[8.5rem]"
      aria-label={`Endre status for ${campaign.name}`}
    />
  );
}

function CreateTemplateForm({ onCreated }: { onCreated: () => void }) {
  const [key, setKey] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await upsertEmailTemplate({ key, subject, bodyHtml });
    setBusy(false);

    if (!result.ok) {
      toast.error("Kunne ikke opprette mal", { description: result.error });
      return;
    }

    toast.success("Mal opprettet", {
      description:
        "Knytt malen til en kampanje, sett status til Aktiv, og bruk «Send til alle» for utsending.",
    });
    setKey("");
    setSubject("");
    setBodyHtml("<p></p>");
    onCreated();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mb-6 space-y-4 rounded-md border border-rn-border-strong/60 bg-muted/10 p-4"
    >
      <h3 className="app-section-title">Opprett mal</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-template-key">Nøkkel</Label>
          <Input
            id="new-template-key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="welcome"
            className="border-2 border-rn-border-strong font-mono"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-template-subject">Emne</Label>
          <Input
            id="new-template-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="border-2 border-rn-border-strong"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-template-body">HTML-innhold</Label>
        <textarea
          id="new-template-body"
          value={bodyHtml}
          onChange={(event) => setBodyHtml(event.target.value)}
          rows={5}
          className="w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-3 py-2 font-mono text-app-sm outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
          required
        />
      </div>
      <AdminActionButton type="submit" disabled={busy}>
        {busy ? "Oppretter…" : "Opprett mal"}
      </AdminActionButton>
    </form>
  );
}

function CreateCampaignForm({
  templates,
  onCreated,
}: {
  templates: AdminEmailTemplate[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [busy, setBusy] = useState(false);

  const templateOptions = [
    { value: "", label: "Ingen mal (utkast)" },
    ...toIdNameOptions(
      templates.map((t) => ({ id: t.key, name: t.subject })),
    ),
  ];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await createNotificationCampaign({
      name,
      templateKey: templateKey || null,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error("Kunne ikke opprette kampanje", { description: result.error });
      return;
    }

    toast.success("Kampanje opprettet");
    setName("");
    setTemplateKey("");
    onCreated();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mb-6 space-y-4 rounded-md border border-rn-border-strong/60 bg-muted/10 p-4"
    >
      <h3 className="app-section-title">Opprett kampanje</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-campaign-name">Navn</Label>
          <Input
            id="new-campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border-2 border-rn-border-strong"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-campaign-template">Mal</Label>
          <FormSelect
            value={templateKey}
            onValueChange={setTemplateKey}
            options={templateOptions}
            aria-label="Velg mal for kampanje"
          />
        </div>
      </div>
      <AdminActionButton type="submit" disabled={busy}>
        {busy ? "Oppretter…" : "Opprett kampanje"}
      </AdminActionButton>
    </form>
  );
}

type AdminNotificationsWorkspaceProps = {
  templates: AdminEmailTemplate[];
  campaigns: AdminNotificationCampaign[];
  deliveries: AdminNotificationDelivery[];
  deliveryTotal: number;
  deliveryFilterCounts: Record<AdminDeliveryFilter, number>;
  stats: AdminNotificationOverviewStats;
  initialView?: AdminNotificationView;
  initialFilter?: string;
  initialSearch?: string;
  emailConfigured?: boolean;
};

export function AdminNotificationsWorkspace({
  templates,
  campaigns,
  deliveries,
  deliveryTotal,
  deliveryFilterCounts,
  stats,
  initialView = "templates",
  initialFilter = "all",
  initialSearch = "",
  emailConfigured = false,
}: AdminNotificationsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<AdminNotificationView>(initialView);
  const [search, setSearch] = useState(initialSearch);
  const [campaignFilter, setCampaignFilter] = useState<AdminCampaignFilter>(
    initialView === "campaigns" && isCampaignFilter(initialFilter)
      ? initialFilter
      : "all",
  );
  const [deliveryFilter, setDeliveryFilter] = useState<AdminDeliveryFilter>(
    initialView === "deliveries" && isDeliveryFilter(initialFilter)
      ? initialFilter
      : "all",
  );
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const viewCounts = useMemo(
    () =>
      computeNotificationViewCounts({
        templates,
        campaigns,
        deliveryTotal,
      }),
    [templates, campaigns, deliveryTotal],
  );

  const campaignCounts = useMemo(
    () => computeCampaignFilterCounts(campaigns),
    [campaigns],
  );

  const deliveryCounts = deliveryFilterCounts;

  const filteredTemplates = useMemo(
    () => templates.filter((t) => matchesTemplateSearch(t, search)),
    [templates, search],
  );

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((c) => matchesCampaignFilter(c, campaignFilter, search)),
    [campaigns, campaignFilter, search],
  );

  const filteredDeliveries = useMemo(
    () =>
      deliveries.filter((d) =>
        matchesDeliveryFilter(d, deliveryFilter, search),
      ),
    [deliveries, deliveryFilter, search],
  );

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(
      query ? `${adminRoutes.notifications}?${query}` : adminRoutes.notifications,
    );
  }

  function updateView(nextView: AdminNotificationView) {
    setView(nextView);
    setExpandedKey(null);
    pushParams((params) => {
      if (nextView === "templates") params.delete("view");
      else params.set("view", nextView);
      params.delete("filter");
    });
    if (nextView === "campaigns") setCampaignFilter("all");
    if (nextView === "deliveries") setDeliveryFilter("all");
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    pushParams((params) => {
      if (!nextSearch.trim()) params.delete("q");
      else params.set("q", nextSearch.trim());
    });
  }

  function updateCampaignFilter(nextFilter: AdminCampaignFilter) {
    setCampaignFilter(nextFilter);
    pushParams((params) => {
      if (nextFilter === "all") params.delete("filter");
      else params.set("filter", nextFilter);
    });
  }

  function updateDeliveryFilter(nextFilter: AdminDeliveryFilter) {
    setDeliveryFilter(nextFilter);
    pushParams((params) => {
      if (nextFilter === "all") params.delete("filter");
      else params.set("filter", nextFilter);
    });
  }

  function refresh() {
    router.refresh();
  }

  const resultSummary =
    view === "templates"
      ? `Viser ${filteredTemplates.length} av ${templates.length} maler`
      : view === "campaigns"
        ? `Viser ${filteredCampaigns.length} av ${campaigns.length} kampanjer`
        : `Viser ${filteredDeliveries.length} av ${deliveryTotal} leveringer`;

  const createAction =
    view !== "deliveries" ? (
      <AdminActionButton
        type="button"
        variant={showCreate ? "outline" : "default"}
        onClick={() => setShowCreate((open) => !open)}
        className={
          showCreate
            ? undefined
            : "border-success bg-success font-semibold text-white shadow-sm hover:bg-success/90"
        }
      >
        {showCreate ? (
          <>
            <X className="size-4" aria-hidden />
            Lukk
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden />
            {view === "templates" ? "Opprett mal" : "Opprett kampanje"}
          </>
        )}
      </AdminActionButton>
    ) : undefined;

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Varsler"
            description="E-postmaler, kampanjer og leveringsstatus."
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <NotificationKpiTile
              label="Aktive kampanjer"
              value={stats.activeCampaigns}
              caption="Klar til utsending"
              icon={Mail}
              active={view === "campaigns" && campaignFilter === "active"}
              href={adminNotificationsHref({ view: "campaigns", filter: "active" })}
            />
            <NotificationKpiTile
              label="Vellykket e-post"
              value={stats.deliverySuccess}
              caption="Levert eller åpnet"
              icon={MailCheck}
              active={view === "deliveries" && deliveryFilter === "all" && !search.trim()}
              href={adminNotificationsHref({ view: "deliveries" })}
            />
            <NotificationKpiTile
              label="Feilet"
              value={stats.deliveryFailed}
              caption="E-post som ikke ble levert"
              icon={MailX}
              iconClassName="bg-rn-danger-soft"
              valueClassName={
                stats.deliveryFailed > 0 ? "text-destructive" : "text-success"
              }
              active={view === "deliveries" && deliveryFilter === "failed"}
              href={adminNotificationsHref({
                view: "deliveries",
                filter: "failed",
              })}
            />
            <NotificationKpiTile
              label="In-app varsler"
              value={stats.inAppDelivered}
              caption="Levert i applikasjonen"
              icon={Bell}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminNotificationFilterBar
            embedded
            search={search}
            onSearchChange={updateSearch}
            view={view}
            onViewChange={updateView}
            viewCounts={viewCounts}
            campaignFilter={campaignFilter}
            onCampaignFilterChange={updateCampaignFilter}
            campaignCounts={campaignCounts}
            deliveryFilter={deliveryFilter}
            onDeliveryFilterChange={updateDeliveryFilter}
            deliveryCounts={deliveryCounts}
            createAction={createAction}
          />
        </section>

        {showCreate && view === "templates" ? (
          <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
            <CreateTemplateForm
              onCreated={() => {
                setShowCreate(false);
                refresh();
              }}
            />
          </section>
        ) : null}
        {showCreate && view === "campaigns" ? (
          <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
            <CreateCampaignForm
              templates={templates}
              onCreated={() => {
                setShowCreate(false);
                refresh();
              }}
            />
          </section>
        ) : null}

        <div className="border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <p className="app-text-secondary">{resultSummary}</p>
        </div>

        <div className="app-table overflow-x-auto border-t border-rn-border-strong/50">
          {view === "templates" ? (
            <table className="w-full min-w-[640px] text-left text-app-base">
              <thead>
                <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                  <th className={cn(tableHeadClass, "w-10")} />
                  <th className={tableHeadClass}>Nøkkel</th>
                  <th className={tableHeadClass}>Emne</th>
                  <th className={tableHeadClass}>Sist endret</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rn-border-strong/50">
                {filteredTemplates.map((template) => {
                  const expanded = expandedKey === template.key;
                  return (
                    <Fragment key={template.key}>
                      <tr className="transition-colors hover:bg-rn-surface-row-hover">
                        <td className={tableCellClass}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedKey(expanded ? null : template.key)
                            }
                            className="inline-flex size-8 items-center justify-center rounded-md border-2 border-rn-border-strong text-muted-foreground transition-colors hover:bg-muted/40"
                            aria-expanded={expanded ? "true" : "false"}
                            aria-label={
                              expanded ? "Skjul detaljer" : "Vis detaljer"
                            }
                          >
                            {expanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        </td>
                        <td className={cn(tableCellClass, "admin-ops-mono font-medium")}>
                          {template.key}
                        </td>
                        <td className={tableCellClass}>{template.subject}</td>
                        <td className={cn(tableCellClass, "text-muted-foreground")}>
                          {format(new Date(template.updatedAt), "d. MMM yyyy HH:mm", {
                            locale: nb,
                          })}
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={4} className="bg-muted/10 px-6 py-4 md:px-8">
                            <NotificationTemplateDetailPanel
                              template={template}
                              onUpdated={refresh}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="px-6 py-16 text-center app-text-muted md:px-8">
                        Ingen maler i dette filteret.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {view === "campaigns" ? (
            <table className="w-full min-w-[880px] text-left text-app-base">
              <thead>
                <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                  <th className={cn(tableHeadClass, "w-10")} />
                  <th className={tableHeadClass}>Navn</th>
                  <th className={tableHeadClass}>Mal</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Opprettet</th>
                  <th className={tableHeadClass}>Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rn-border-strong/50">
                {filteredCampaigns.map((campaign) => {
                  const expanded = expandedKey === campaign.id;
                  return (
                    <Fragment key={campaign.id}>
                      <tr className="transition-colors hover:bg-rn-surface-row-hover">
                        <td className={tableCellClass}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedKey(expanded ? null : campaign.id)
                            }
                            className="inline-flex size-8 items-center justify-center rounded-md border-2 border-rn-border-strong text-muted-foreground transition-colors hover:bg-muted/40"
                            aria-expanded={expanded ? "true" : "false"}
                            aria-label={
                              expanded ? "Skjul detaljer" : "Vis detaljer"
                            }
                          >
                            {expanded ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        </td>
                        <td className={cn(tableCellClass, "font-heading font-semibold")}>
                          {campaign.name}
                        </td>
                        <td className={cn(tableCellClass, "font-mono text-app-xs text-muted-foreground")}>
                          {campaign.templateKey ?? "—"}
                        </td>
                        <td className={tableCellClass}>
                          <span
                            className={cn(
                              "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold",
                              campaignStatusBadgeClass(campaign.status),
                            )}
                          >
                            {formatCampaignStatusLabel(campaign.status)}
                          </span>
                        </td>
                        <td className={cn(tableCellClass, "text-muted-foreground")}>
                          {format(new Date(campaign.createdAt), "d. MMM yyyy", {
                            locale: nb,
                          })}
                        </td>
                        <td className={tableCellClass}>
                          <div className="flex flex-wrap items-center gap-2">
                            <CampaignStatusSelect
                              campaign={campaign}
                              onUpdated={refresh}
                            />
                            <CampaignSendButton
                              campaign={campaign}
                              onSent={refresh}
                            />
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td colSpan={6} className="bg-muted/10 px-6 py-4 md:px-8">
                            <NotificationCampaignDetailPanel campaign={campaign} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="px-6 py-16 text-center app-text-muted md:px-8">
                        Ingen kampanjer i dette filteret.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {view === "deliveries" ? (
            <table className="w-full min-w-[640px] text-left text-app-base">
              <thead>
                <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                  <th className={tableHeadClass}>Mottaker</th>
                  <th className={tableHeadClass}>Kampanje</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Tidspunkt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rn-border-strong/50">
                {filteredDeliveries.map((delivery) => (
                  <tr
                    key={delivery.id}
                    className="transition-colors hover:bg-rn-surface-row-hover"
                  >
                    <td className={tableCellClass}>{delivery.recipientEmail}</td>
                    <td className={tableCellClass}>{delivery.campaignName}</td>
                    <td className={tableCellClass}>
                      <span
                        className={cn(
                          "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold",
                          deliveryStatusBadgeClass(delivery.status),
                        )}
                      >
                        {formatDeliveryStatusLabel(delivery.status)}
                      </span>
                    </td>
                    <td className={cn(tableCellClass, "text-muted-foreground")}>
                      {format(new Date(delivery.createdAt), "d. MMM yyyy HH:mm", {
                        locale: nb,
                      })}
                    </td>
                  </tr>
                ))}
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="px-6 py-16 text-center app-text-muted md:px-8">
                        Ingen leveringer i dette filteret.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </div>

        <p
          className={cn(
            "border-t border-rn-border-strong/50 px-4 py-4 text-app-sm sm:px-5 md:px-6 lg:px-8",
            emailConfigured ? "text-success" : "text-amber-700 dark:text-amber-300",
          )}
        >
          <span className="font-semibold">
            {emailConfigured ? "E-post aktiv." : "E-post ikke konfigurert."}
          </span>{" "}
          <span className="text-muted-foreground">
            {emailConfigured
              ? "Automatiske varsler og kampanjer leveres i app og på e-post."
              : "In-app varsler virker. E-post krever Resend-oppsett."}
          </span>
        </p>
      </div>
    </div>
  );
}

function isCampaignFilter(value: string): value is AdminCampaignFilter {
  return (
    value === "all" ||
    value === "draft" ||
    value === "active" ||
    value === "paused"
  );
}

function isDeliveryFilter(value: string): value is AdminDeliveryFilter {
  return (
    value === "all" ||
    value === "sent" ||
    value === "delivered" ||
    value === "opened" ||
    value === "failed"
  );
}
