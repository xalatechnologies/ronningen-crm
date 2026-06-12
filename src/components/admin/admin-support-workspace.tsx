"use client";

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
import { adminSupportHref } from "@/lib/admin/dashboard-links";
import type {
  AdminSupportOverview,
  AdminSupportTicket,
} from "@/lib/admin/queries/support";
import {
  SUPPORT_SETTABLE_STATUSES,
  SUPPORT_STATUS_LABELS,
  type SupportTicketStatus,
} from "@/lib/admin/support-labels";
import { SUPPORT_CATEGORY_LABELS } from "@/lib/support/labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Inbox,
  LifeBuoy,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_OPTIONS = SUPPORT_SETTABLE_STATUSES.map((value) => ({
  value,
  label: SUPPORT_STATUS_LABELS[value],
}));

const tableHeadClass =
  "px-6 py-4 text-left text-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

const kpiTileClass =
  "flex w-full flex-col justify-between rounded-md border border-rn-border-strong/55 bg-background p-5 text-left shadow-sm transition-colors hover:border-success/35 hover:bg-rn-surface-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 sm:p-6";

function SupportKpiTile({
  label,
  value,
  caption,
  icon: Icon,
  iconClassName,
  valueClassName,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: typeof LifeBuoy;
  iconClassName?: string;
  valueClassName?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        kpiTileClass,
        active && "border-success/50 bg-rn-surface-gradient-from/40",
      )}
      aria-pressed={active ? "true" : "false"}
    >
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
    </button>
  );
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
  const [busy, setBusy] = useState(false);

  async function handleChange(nextStatus: string) {
    if (!nextStatus || nextStatus === ticket.status) return;

    setBusy(true);
    const result = await updateSupportTicketStatus({
      ticketId: ticket.id,
      status: nextStatus as SupportTicketStatus,
    });
    setBusy(false);

    if (!result.ok) {
      toast.error("Kunne ikke oppdatere status", { description: result.error });
      return;
    }

    toast.success("Status oppdatert");
    onUpdated();
  }

  return (
    <FormSelect
      value={ticket.status}
      onValueChange={(value) => void handleChange(value)}
      options={STATUS_OPTIONS}
      disabled={busy}
      className="admin-table-select min-w-[8.5rem]"
      aria-label={`Endre status for ${ticket.subject}`}
    />
  );
}

function noteLabel(note: AdminSupportTicket["notes"][number]): string {
  if (note.isInternal) return "Intern notat";
  if (note.authorIsPlatformAdmin) return "Plattformsupport";
  return note.authorName ?? "Kunde";
}

function SupportNoteThread({
  ticket,
  onUpdated,
}: {
  ticket: AdminSupportTicket;
  onUpdated: () => void;
}) {
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
      toast.error("Kunne ikke lagre notat", { description: result.error });
      return;
    }

    setBody("");
    setIsInternal(false);
    toast.success(isInternal ? "Internt notat lagt til" : "Svar sendt til kunde");
    onUpdated();
  }

  return (
    <div className="space-y-4 py-2">
      {ticket.notes.length === 0 ? (
        <p className="app-text-muted">Ingen meldinger ennå.</p>
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
                {noteLabel(note)} ·{" "}
                {format(new Date(note.createdAt), "d. MMM yyyy HH:mm", {
                  locale: nb,
                })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`note-${ticket.id}`}>
            {isInternal ? "Internt notat" : "Svar til kunde"}
          </Label>
          <textarea
            id={`note-${ticket.id}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-3 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
            placeholder={
              isInternal
                ? "Intern oppfølging, ikke synlig for kunden…"
                : "Svar som kunden kan lese…"
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
          {busy ? "Lagrer…" : isInternal ? "Legg til internt notat" : "Send svar"}
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
      toast.error("Kunne ikke opprette sak", { description: result.error });
      return;
    }

    toast.success("Support-sak opprettet");
    setOrganizationId("");
    setSubject("");
    onCreated();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-md border-2 border-rn-border-strong bg-muted/15 p-4 sm:p-5"
    >
      <h3 className="app-section-title">Opprett support-sak</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-org">Organisasjon</Label>
          <FormSelect
            id="support-org"
            value={organizationId}
            onValueChange={setOrganizationId}
            options={toIdNameOptions(orgOptions)}
            placeholder="Velg organisasjon"
            aria-label="Organisasjon for support-sak"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-subject">Emne</Label>
          <input
            id="support-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Kort beskrivelse av saken"
            className="box-border min-h-11 w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-4 py-2.5 text-app-base outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <AdminActionButton
          type="submit"
          disabled={busy || !organizationId || subject.trim().length < 3}
        >
          {busy ? "Oppretter…" : "Opprett sak"}
        </AdminActionButton>
        <AdminActionButton type="button" variant="outline" onClick={onCancel}>
          Avbryt
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<AdminSupportFilter>(initialFilter);
  const [search, setSearch] = useState(initialSearch);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  const openCaption =
    overview.open === 0
      ? "Ingen åpne saker akkurat nå"
      : "Krever oppfølging";

  const waitingCaption =
    overview.waiting === 0
      ? "Ingen saker venter på svar"
      : "Venter på kunde eller intern";

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col gap-8 pb-8">
      <AdminQueuePanel
        title="Åpne saker"
        items={data.openQueue}
        emptyLabel="Ingen åpne support-saker."
        viewAllHref={adminSupportHref("open")}
      />

      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Support"
            description="Support-saker og intern oppfølging per organisasjon."
            actions={
              <AdminActionButton
                type="button"
                onClick={() => setShowCreate((open) => !open)}
              >
                {showCreate ? "Lukk skjema" : "Opprett sak"}
              </AdminActionButton>
            }
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <SupportKpiTile
              label="Totalt"
              value={overview.total}
              caption="Alle support-saker"
              icon={LifeBuoy}
              active={filter === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateFilter("all");
              }}
            />
            <SupportKpiTile
              label="Åpne"
              value={overview.open}
              caption={openCaption}
              icon={Inbox}
              iconClassName="bg-rn-danger-soft"
              valueClassName={
                overview.open > 0 ? "text-destructive" : "text-success"
              }
              active={filter === "open"}
              onClick={() => updateFilter("open")}
            />
            <SupportKpiTile
              label="Venter"
              value={overview.waiting}
              caption={waitingCaption}
              icon={Clock}
              iconClassName="bg-amber-500/10"
              valueClassName={
                overview.waiting > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success"
              }
              active={filter === "waiting"}
              onClick={() => updateFilter("waiting")}
            />
            <SupportKpiTile
              label="Løst"
              value={overview.resolved}
              caption="Avsluttede saker"
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

        <div className="border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
          <p className="app-text-secondary">
            Viser {filtered.length} av {data.tickets.length} saker
          </p>
        </div>

        <div className="app-table overflow-x-auto border-t border-rn-border-strong/50">
          <table className="w-full min-w-[960px] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={cn(tableHeadClass, "w-10")} />
                <th className={tableHeadClass}>Organisasjon</th>
                <th className={tableHeadClass}>Emne</th>
                <th className={tableHeadClass}>Status</th>
                <th className={cn(tableHeadClass, "text-right")}>Notater</th>
                <th className={tableHeadClass}>Opprettet</th>
                <th className={tableHeadClass}>Oppdatert</th>
                <th className={tableHeadClass}>Handlinger</th>
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
                            expanded ? "Skjul notater" : "Vis notater"
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
                          {SUPPORT_CATEGORY_LABELS[ticket.category]}
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
                          locale: nb,
                        })}
                      </td>
                      <td className={cn(tableCellClass, "text-muted-foreground")}>
                        {format(new Date(ticket.updatedAt), "d. MMM yyyy HH:mm", {
                          locale: nb,
                        })}
                      </td>
                      <td className={tableCellClass}>
                        <AdminLinkButton
                          href={adminRoutes.organizationDetail(ticket.organizationId)}
                        >
                          Organisasjon
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
                          ? "Ingen support-saker ennå"
                          : "Ingen treff i listen"}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {data.tickets.length === 0
                          ? "Opprett en sak for å starte oppfølging."
                          : "Juster søket eller bytt filter. Nullstill ved å velge «Totalt» og tømme søkefeltet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="border-t border-rn-border-strong/50 px-4 py-4 app-text-muted sm:px-5 md:px-6 lg:px-8">
          Kunder ser offentlige svar i Innstillinger → Support. Interne notater
          og frie organisasjonsnotater finnes under organisasjonsdetaljer →
          Support.
        </p>
      </div>
    </div>
  );
}
