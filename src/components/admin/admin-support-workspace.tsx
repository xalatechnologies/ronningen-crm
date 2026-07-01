"use client";

import { useTranslation } from "@/i18n/client";
import {
  AdminActionButton,
  AdminLinkButton,
} from "@/components/admin/admin-action-button";
import { AdminQueuePanel } from "@/components/admin/admin-queue-panel";
import {
  AdminSupportFilterBar,
  computeAdminSupportFilterCounts,
  computeAdminSupportOverviewStats,
  matchesAdminSupportFilter,
  type AdminSupportFilter,
} from "@/components/admin/admin-support-filters";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { FormSelect, toIdNameOptions } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { adminRoutes } from "@/config/admin-routes";
import {
  addSupportNote,
  createSupportTicket,
  updateSupportTicketStatus,
} from "@/lib/admin/actions/support";
import type {
  AdminSupportOverview,
  AdminSupportTicket,
} from "@/lib/admin/queries/support";
import {
  SUPPORT_SETTABLE_STATUSES,
  supportStatusLabel,
  type SupportTicketStatus,
} from "@/lib/admin/support-labels";
import { supportCategoryLabel } from "@/lib/support/labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Inbox,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const kpiTileClass =
  "flex min-h-[length:var(--app-tap-target-min)] flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 shadow-sm sm:p-6";

const tableHeadClass =
  "px-4 py-3 text-left text-app-sm font-semibold tracking-wider text-rn-text-column uppercase sm:px-6 sm:py-4 sm:text-app-base md:px-8 md:py-5";
const tableCellClass =
  "px-4 py-4 align-middle sm:px-6 sm:py-5 md:px-8 md:py-6";

function SupportKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  active,
  onClick,
  iconContainerClassName = "rounded-md bg-accent p-2 dark:bg-white/10",
  iconClassName = "size-6 text-primary dark:text-white",
  valueClassName = "text-success",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  iconContainerClassName?: string;
  iconClassName?: string;
  valueClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        kpiTileClass,
        "group w-full text-left transition-colors hover:border-success/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30",
        active && "border-success/40 bg-muted/20 ring-2 ring-success/25",
      )}
    >
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
    </button>
  );
}

function parseSupportFilter(value: string | null): AdminSupportFilter {
  if (value === "open" || value === "waiting" || value === "resolved") {
    return value;
  }
  return "all";
}

function ticketRowClass(status: SupportTicketStatus): string | undefined {
  if (status === "waiting") return "bg-amber-500/5";
  if (status === "resolved") return "opacity-80";
  return undefined;
}

function SupportStatusSelect({
  ticket,
  onUpdated,
}: {
  ticket: AdminSupportTicket;
  onUpdated: () => void;
}) {
  const { t, locale } = useTranslation();
  const [busy, setBusy] = useState(false);
  const statusOptions = useMemo(
    () =>
      SUPPORT_SETTABLE_STATUSES.map((value) => ({
        value,
        label: supportStatusLabel(value, t),
      })),
    [t],
  );

  async function handleChange(nextStatus: string) {
    if (!nextStatus || nextStatus === ticket.status) return;

    setBusy(true);
    const result = await updateSupportTicketStatus({
      ticketId: ticket.id,
      status: nextStatus as SupportTicketStatus,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_oppdatere_status"), { description: result.error });
      return;
    }

    toast.success(t("admin.status_oppdatert"));
    onUpdated();
  }

  return (
    <FormSelect
      value={ticket.status}
      onValueChange={(value) => void handleChange(value)}
      options={statusOptions}
      disabled={busy}
      className="admin-table-select min-w-[8.5rem]"
      aria-label={`Endre status for ${ticket.subject}`}
    />
  );
}

function noteLabel(
  note: AdminSupportTicket["notes"][number],
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (note.isInternal) return t("admin.internt_notat");
  if (note.authorIsPlatformAdmin) return t("admin.plattformsupport");
  return note.authorName ?? t("admin.kunde");
}

function SupportNoteThread({
  ticket,
  onUpdated,
}: {
  ticket: AdminSupportTicket;
  onUpdated: () => void;
}) {
  const { t, locale } = useTranslation();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (body.trim().length < 3) return;

    setBusy(true);
    const result = await addSupportNote({
      ticketId: ticket.id,
      body,
      isInternal,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_lagre_notat"), { description: result.error });
      return;
    }

    setBody("");
    setIsInternal(false);
    toast.success(isInternal ? t("admin.internt_notat_lagt_til") : t("admin.svar_sendt_til_kunde"));
    onUpdated();
  }

  return (
    <div className="space-y-4 py-2">
      {ticket.notes.length === 0 ? (
        <p className="app-text-muted">{t("adminLabels.empty.noMessages")}</p>
      ) : (
        <ul className="space-y-3">
          {ticket.notes.map((note) => (
            <li
              key={note.id}
              className={cn(
                "rounded-md border-2 px-4 py-3",
                note.isInternal
                  ? "border-dashed border-muted-foreground/40 bg-muted/10 opacity-80"
                  : note.authorIsPlatformAdmin
                    ? "border-success/30 bg-success/5"
                    : "border-rn-border-strong bg-muted/20",
              )}
            >
              <p className="whitespace-pre-wrap text-app-sm">{note.body}</p>
              <p className="mt-2 text-app-xs text-muted-foreground">
                {noteLabel(note, t)} ·{" "}
                {format(new Date(note.createdAt), "d. MMM yyyy HH:mm", {
                  locale: getDateFnsLocale(locale),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`note-${ticket.id}`}>
            {isInternal ? t("admin.internt_notat") : t("admin.svar_til_kunde")}
          </Label>
          <textarea
            id={`note-${ticket.id}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
            placeholder={
              isInternal
                ? t("admin.intern_oppfolging_ikke_synlig_for_kunden")
                : t("admin.svar_som_kunden_kan_lese")
            }
          />
        </div>
        <label className="flex items-center gap-2 text-app-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(event) => setIsInternal(event.target.checked)}
            className="size-4 rounded border-2 border-rn-border-strong"
          />
          Intern notat (ikke synlig for kunde)
        </label>
        <AdminActionButton type="submit" disabled={busy || body.trim().length < 3}>
          {busy ? t("admin.lagrer") : isInternal ? t("admin.legg_til_internt_notat") : t("admin.send_svar")}
        </AdminActionButton>
      </form>
    </div>
  );
}

function CreateSupportTicketForm({
  orgOptions,
  onCreated,
  onCancel,
}: {
  orgOptions: { id: string; name: string }[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { t, locale } = useTranslation();
  const [organizationId, setOrganizationId] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!organizationId || subject.trim().length < 3) return;

    setBusy(true);
    const result = await createSupportTicket({
      organizationId,
      subject: subject.trim(),
    });
    setBusy(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_opprette_sak"), { description: result.error });
      return;
    }

    toast.success(t("admin.support_sak_opprettet"));
    setOrganizationId("");
    setSubject("");
    onCreated();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-md border-2 border-rn-border-strong bg-muted/15 p-4 sm:p-5"
    >
      <h3 className="app-section-title">{t("adminLabels.sections.createSupportTicket")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-org">{t("adminLabels.fields.organization")}</Label>
          <FormSelect
            id="support-org"
            value={organizationId}
            onValueChange={setOrganizationId}
            options={toIdNameOptions(orgOptions)}
            placeholder={t("admin.velg_organisasjon")}
            aria-label={t("admin.organisasjon_for_support_sak")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-subject">{t("adminLabels.fields.subject")}</Label>
          <input
            id="support-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={t("admin.kort_beskrivelse_av_saken")}
            className="box-border min-h-11 w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-2.5 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <AdminActionButton
          type="submit"
          disabled={busy || !organizationId || subject.trim().length < 3}
        >
          {busy ? t("admin.oppretter") : t("admin.opprett_sak")}
        </AdminActionButton>
        <AdminActionButton type="button" variant="outline" onClick={onCancel}>
          {t("common.actions.cancel")}
        </AdminActionButton>
      </div>
    </form>
  );
}

export function AdminSupportWorkspace({
  data,
  initialFilter = "all",
  initialSearch = "",
}: {
  data: AdminSupportOverview;
  initialFilter?: AdminSupportFilter;
  initialSearch?: string;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<AdminSupportFilter>(initialFilter);
  const [search, setSearch] = useState(initialSearch);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setFilter(parseSupportFilter(searchParams.get("filter")));
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const counts = useMemo(
    () => computeAdminSupportFilterCounts(data.tickets),
    [data.tickets],
  );

  const overview = useMemo(
    () => computeAdminSupportOverviewStats(data.tickets),
    [data.tickets],
  );

  const filtered = useMemo(
    () =>
      data.tickets.filter((ticket) =>
        matchesAdminSupportFilter(ticket, filter, search),
      ),
    [data.tickets, filter, search],
  );

  function refresh() {
    router.refresh();
  }

  function updateUrl(next: { filter?: AdminSupportFilter; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilter = next.filter ?? filter;
    const nextSearch = next.q ?? search;

    if (nextFilter === "all") params.delete("filter");
    else params.set("filter", nextFilter);

    if (!nextSearch.trim()) params.delete("q");
    else params.set("q", nextSearch.trim());

    const query = params.toString();
    router.push(query ? `${adminRoutes.support}?${query}` : adminRoutes.support);
  }

  function updateFilter(nextFilter: AdminSupportFilter) {
    setFilter(nextFilter);
    updateUrl({ filter: nextFilter });
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    updateUrl({ q: nextSearch });
  }

  function showOpenTickets() {
    updateFilter("open");
    document
      .getElementById("support-ticket-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const openCaption =
    overview.open === 0
      ? t("admin.ingen_apne_saker_akkurat_na")
      : t("admin.krever_oppfolging");

  const waitingCaption =
    overview.waiting === 0
      ? t("admin.ingen_saker_venter_pa_svar")
      : t("admin.venter_pa_kunde_eller_intern");

  return (
    <div className="admin-page-workspace admin-support-dashboard mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 pb-8">
      <AdminQueuePanel
        title={t("admin.apne_saker")}
        items={data.openQueue}
        emptyLabel={t("admin.ingen_apne_support_saker")}
        onViewAll={showOpenTickets}
      />

      <div className={cn("dashboard-oversikt-card min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title={t("admin.support")}
            description={t("admin.support_saker_og_intern_oppfolging_per_organisasjon")}
            actions={
              <AdminActionButton
                type="button"
                onClick={() => setShowCreate((open) => !open)}
              >
                {showCreate ? t("admin.lukk_skjema") : t("admin.opprett_sak")}
              </AdminActionButton>
            }
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label={t("admin.nokkeltall")}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <SupportKpiTile
              label={t("admin.totalt")}
              value={overview.total}
              caption={t("admin.alle_support_saker")}
              icon={LifeBuoy}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <SupportKpiTile
              label={t("admin.apne")}
              value={overview.open}
              caption={openCaption}
              icon={Inbox}
              iconContainerClassName="rounded-md bg-rn-danger-soft p-2"
              iconClassName="size-6 text-rn-danger-ink"
              valueClassName={
                overview.open > 0 ? "text-destructive" : "text-success"
              }
              active={filter === "open"}
              onClick={() => updateFilter("open")}
            />
            <SupportKpiTile
              label={t("admin.venter")}
              value={overview.waiting}
              caption={waitingCaption}
              icon={Clock}
              iconContainerClassName="rounded-md bg-amber-500/10 p-2"
              iconClassName="size-6 text-amber-800 dark:text-amber-300"
              valueClassName={
                overview.waiting > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success"
              }
              active={filter === "waiting"}
              onClick={() => updateFilter("waiting")}
            />
            <SupportKpiTile
              label={t("admin.lost")}
              value={overview.resolved}
              caption={t("admin.avsluttede_saker")}
              icon={CheckCircle2}
              active={filter === "resolved"}
              onClick={() => updateFilter("resolved")}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminSupportFilterBar
            embedded
            search={search}
            onSearchChange={updateSearch}
            filter={filter}
            onFilterChange={updateFilter}
            counts={counts}
          />
        </section>

        {showCreate ? (
          <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
            <CreateSupportTicketForm
              orgOptions={data.orgOptions}
              onCreated={() => {
                setShowCreate(false);
                refresh();
              }}
              onCancel={() => setShowCreate(false)}
            />
          </section>
        ) : null}

        <div
          id="support-ticket-list"
          className="app-table -mx-px max-w-full overflow-x-auto border-t border-rn-border-strong/50 overscroll-x-contain"
        >
          <table className="w-full min-w-[52rem] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={cn(tableHeadClass, "w-10")} />
                <th className={tableHeadClass}>{t("adminLabels.fields.organization")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.subject")}</th>
                <th className={tableHeadClass}>{t("admin.status")}</th>
                <th className={cn(tableHeadClass, "text-right")}>{t("adminLabels.fields.notes")}</th>
                <th className={tableHeadClass}>{t("adminLabels.fields.created")}</th>
                <th className={tableHeadClass}>{t("admin.oppdatert")}</th>
                <th className={tableHeadClass}>{t("adminLabels.actions.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((ticket) => {
                const expanded = expandedId === ticket.id;
                return (
                  <Fragment key={ticket.id}>
                    <tr
                      className={cn(
                        "transition-colors hover:bg-rn-surface-row-hover",
                        ticketRowClass(ticket.status),
                      )}
                    >
                      <td className={tableCellClass}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : ticket.id)
                          }
                          className="inline-flex size-8 items-center justify-center rounded-md border-2 border-rn-border-strong text-muted-foreground transition-colors hover:bg-muted/40"
                          aria-expanded={expanded}
                          aria-label={
                            expanded ? t("admin.skjul_notater") : t("admin.vis_notater")
                          }
                        >
                          {expanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-0 align-middle">
                        <AdminTableDetailLink
                          href={adminRoutes.organizationDetail(ticket.organizationId)}
                          title={ticket.organizationName}
                          subtitle={ticket.organizationSlug}
                        />
                      </td>
                      <td className={cn(tableCellClass, "max-w-[16rem]")}>
                        <span className="font-medium">{ticket.subject}</span>
                        <p className="mt-1 text-app-xs text-muted-foreground">
                          {supportCategoryLabel(ticket.category, t)}
                          {ticket.ticketSource === "tenant"
                            ? " · Fra kunde"
                            : ticket.ticketSource === "admin"
                              ? " · Fra admin"
                              : null}
                          {ticket.createdByName ? ` · ${ticket.createdByName}` : ""}
                        </p>
                        {ticket.assignedToName ? (
                          <p className="mt-1 text-app-xs text-muted-foreground">
                            Tildelt {ticket.assignedToName}
                          </p>
                        ) : null}
                      </td>
                      <td className={tableCellClass}>
                        <SupportStatusSelect
                          ticket={ticket}
                          onUpdated={refresh}
                        />
                      </td>
                      <td className={cn(tableCellClass, "text-right tabular-nums")}>
                        {ticket.noteCount}
                      </td>
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {format(new Date(ticket.createdAt), "d. MMM yyyy", {
                          locale: getDateFnsLocale(locale),
                        })}
                      </td>
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {format(new Date(ticket.updatedAt), "d. MMM yyyy HH:mm", {
                          locale: getDateFnsLocale(locale),
                        })}
                      </td>
                      <td className={tableCellClass}>
                        <AdminLinkButton
                          href={adminRoutes.organizationDetail(ticket.organizationId)}
                        >
                          {t("adminLabels.fields.organization")}
                        </AdminLinkButton>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={8} className="bg-muted/10 px-6 py-4 md:px-8">
                          <SupportNoteThread ticket={ticket} onUpdated={refresh} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        {data.tickets.length === 0
                          ? t("admin.ingen_support_saker_enna")
                          : t("admin.ingen_treff_i_listen")}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {data.tickets.length === 0
                          ? t("admin.opprett_en_sak_for_a_starte_oppfolging")
                          : t("admin.juster_soket_eller_bytt_filter_nullstill_ved_a_velge_totalt_")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <p className="app-text-secondary">
            {t("admin.viser_av_saker", {
              shown: filtered.length,
              total: data.tickets.length,
            })}
          </p>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          {t("admin.support_workspace_footer")}
        </p>
      </div>
    </div>
  );
}
