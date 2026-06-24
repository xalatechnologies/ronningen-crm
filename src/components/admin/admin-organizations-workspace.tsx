"use client";

import { AdminKpiTile } from "@/components/admin/admin-kpi-tile";
import { AdminAccessBadge } from "@/components/admin/admin-access-badge";
import { AdminPlanBadge } from "@/components/admin/admin-badges";
import { AdminHealthBadge } from "@/components/admin/admin-health-badge";
import {
  AdminActionButton,
} from "@/components/admin/admin-action-button";
import {
  AdminOrgFilters,
  computeAdminOrgFilterCounts,
  computeAdminOrgOverviewStats,
  matchesAdminOrgFilter,
  type AdminOrgFilterStatus,
} from "@/components/admin/admin-org-filters";
import { AdminTableDetailLink } from "@/components/admin/admin-table-detail-link";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRoutes } from "@/config/admin-routes";
import {
  bulkExtendTrial,
  bulkSuspendOrganizations,
  bulkUnsuspendOrganizations,
  exportOrganizationsCsv,
} from "@/lib/admin/actions/organizations-bulk";
import type { AdminOrganizationRow } from "@/lib/admin/queries/organizations";
import { formatNok } from "@/lib/admin/revenue-metrics";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  TrendingUp,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AdminOrganizationsWorkspaceProps = {
  organizations: AdminOrganizationRow[];
  initialStatus?: AdminOrgFilterStatus;
  initialSearch?: string;
  billingEnabled?: boolean;
};

const tableHeadClass =
  "px-6 py-4 text-left text-app-base font-semibold tracking-wider text-rn-text-column uppercase md:px-8 md:py-5";
const tableCellClass = "px-6 py-5 align-middle md:px-8 md:py-6";

export function AdminOrganizationsWorkspace({
  organizations,
  initialStatus = "all",
  initialSearch = "",
  billingEnabled = false,
}: AdminOrganizationsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<AdminOrgFilterStatus>(initialStatus);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [trialOpen, setTrialOpen] = useState(false);
  const [trialDays, setTrialDays] = useState("7");

  const counts = useMemo(
    () => computeAdminOrgFilterCounts(organizations),
    [organizations],
  );

  const overview = useMemo(
    () => computeAdminOrgOverviewStats(organizations),
    [organizations],
  );

  const filtered = useMemo(
    () =>
      organizations.filter((org) => matchesAdminOrgFilter(org, search, status)),
    [organizations, search, status],
  );

  function updateUrl(next: { status?: AdminOrgFilterStatus; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextStatus = next.status ?? status;
    const nextSearch = next.q ?? search;

    if (nextStatus === "all") params.delete("status");
    else params.set("status", nextStatus);

    if (!nextSearch.trim()) params.delete("q");
    else params.set("q", nextSearch.trim());

    const query = params.toString();
    router.push(
      query ? `${adminRoutes.organizations}?${query}` : adminRoutes.organizations,
    );
  }

  function updateStatus(nextStatus: AdminOrgFilterStatus) {
    setStatus(nextStatus);
    updateUrl({ status: nextStatus });
  }

  function updateSearch(nextSearch: string) {
    setSearch(nextSearch);
    updateUrl({ q: nextSearch });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(filtered.map((o) => o.id)));
    } else {
      setSelected(new Set());
    }
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleExport() {
    setBusy(true);
    const ids = selected.size > 0 ? [...selected] : [];
    const result = await exportOrganizationsCsv(ids);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "organisasjoner.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV eksportert");
  }

  async function handleBulkSuspend() {
    const reason = suspendReason.trim();
    if (!reason) {
      toast.error("Angi en begrunnelse");
      return;
    }
    setBusy(true);
    const result = await bulkSuspendOrganizations({
      organizationIds: [...selected],
      reason,
    });
    setBusy(false);
    if (result.ok) {
      toast.success("Organisasjoner suspendert");
      setSelected(new Set());
      setSuspendOpen(false);
      setSuspendReason("");
      router.refresh();
    }
  }

  async function handleBulkUnsuspend() {
    setBusy(true);
    const result = await bulkUnsuspendOrganizations([...selected]);
    setBusy(false);
    if (result.ok) {
      toast.success("Suspensjon opphevet");
      setSelected(new Set());
      router.refresh();
    }
  }

  async function handleBulkExtendTrial() {
    const days = Number(trialDays);
    if (!days || days < 1) {
      toast.error("Angi et gyldig antall dager");
      return;
    }
    setBusy(true);
    const result = await bulkExtendTrial({
      organizationIds: [...selected],
      extraDays: days,
    });
    setBusy(false);
    if (result.ok) {
      toast.success("Prøveperiode utvidet");
      setSelected(new Set());
      setTrialOpen(false);
      setTrialDays("7");
      router.refresh();
    }
  }

  const allSelected =
    filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  const venuesCaption =
    overview.totalVenues === 0
      ? "Ingen lokaler registrert ennå"
      : `${overview.totalVenues} lokal${overview.totalVenues !== 1 ? "er" : ""} totalt`;

  const followUpCaption =
    overview.needsFollowUp === 0
      ? "Ingen organisasjoner trenger oppfølging"
      : "Ufullstendig, forfalt eller suspendert";

  return (
    <div className="admin-page-workspace mx-auto flex w-full min-w-0 flex-col pb-8">
      <div className={cn("dashboard-oversikt-card overflow-hidden", RN_CARD_SHELL)}>
        <div className="dashboard-oversikt-hero px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AppPageHeader
            className="mb-0"
            surface="default"
            compact
            title="Organisasjoner"
            description="Oversikt over leietakerorganisasjoner, helse og tilgangsstatus."
            actions={
              <AdminActionButton
                type="button"
                disabled={busy}
                onClick={() => void handleExport()}
                className="gap-2"
              >
                <Download className="size-4 shrink-0" aria-hidden />
                Eksporter CSV
              </AdminActionButton>
            }
          />
        </div>

        <section
          className="border-t border-rn-border-strong/50 px-4 py-5 sm:px-5 sm:py-6 md:px-6 lg:px-8"
          aria-label="Nøkkeltall"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            <AdminKpiTile
              variant="organizations"
              label="Totalt"
              value={overview.total}
              caption={venuesCaption}
              icon={Building2}
              active={status === "all" && !search.trim()}
              onClick={() => {
                setSearch("");
                updateStatus("all");
              }}
            />
            <AdminKpiTile
              variant="organizations"
              label="Aktive"
              value={overview.active}
              caption="Trialing og aktive abonnement"
              icon={CheckCircle2}
              active={status === "active"}
              onClick={() => updateStatus("active")}
            />
            <AdminKpiTile
              variant="organizations"
              label="Trenger oppfølging"
              value={overview.needsFollowUp}
              caption={followUpCaption}
              icon={AlertTriangle}
              iconClassName="bg-amber-500/10"
              valueClassName={
                overview.needsFollowUp > 0
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-success dark:!text-white"
              }
              active={
                status === "incomplete" ||
                status === "past_due" ||
                status === "suspended"
              }
              onClick={() => updateStatus("incomplete")}
            />
            <AdminKpiTile
              variant="organizations"
              label="Total inntekt"
              value={formatNok(overview.totalRevenue)}
              caption="Fakturert bookinginntekt"
              icon={TrendingUp}
              onClick={() => updateStatus("all")}
            />
          </div>
        </section>

        <section className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 md:px-6 lg:px-8">
          <AdminOrgFilters
            embedded
            search={search}
            onSearchChange={updateSearch}
            status={status}
            onStatusChange={updateStatus}
            counts={counts}
          />
        </section>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-rn-border-strong/50 px-4 py-3 sm:px-5 md:px-6 lg:px-8">
            <div className="flex flex-wrap gap-2">
              <AdminActionButton
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setSuspendOpen(true)}
              >
                Suspender ({selected.size})
              </AdminActionButton>
              <AdminActionButton
                type="button"
                disabled={busy}
                onClick={() => void handleBulkUnsuspend()}
              >
                Opphev suspensjon
              </AdminActionButton>
              <AdminActionButton
                type="button"
                disabled={busy}
                onClick={() => setTrialOpen(true)}
              >
                Utvid prøve
              </AdminActionButton>
            </div>
          </div>
        ) : null}

        <div className="app-table overflow-x-auto border-t border-rn-border-strong/50">
          <table className="w-full min-w-[960px] text-left text-app-base">
            <thead>
              <tr className="border-b-2 border-rn-border-strong/50 bg-rn-surface-table-head">
                <th className={cn(tableHeadClass, "w-12")}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Velg alle"
                    className="size-4 rounded border-rn-border-strong"
                  />
                </th>
                <th className={tableHeadClass}>Navn</th>
                <th className={tableHeadClass}>Helse</th>
                <th className={tableHeadClass}>Tilgang</th>
                <th className={tableHeadClass}>Plan</th>
                <th className={tableHeadClass}>Prøve slutt</th>
                <th className={tableHeadClass}>Lokaler</th>
                <th className={tableHeadClass}>Inntekt</th>
                <th className={tableHeadClass}>Sist aktiv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rn-border-strong/50">
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="transition-colors hover:bg-rn-surface-row-hover"
                >
                  <td className={tableCellClass}>
                    <input
                      type="checkbox"
                      checked={selected.has(org.id)}
                      onChange={(e) => toggleOne(org.id, e.target.checked)}
                      aria-label={`Velg ${org.name}`}
                      className="size-4 rounded border-rn-border-strong"
                    />
                  </td>
                  <td className="p-0 align-middle">
                    <AdminTableDetailLink
                      href={adminRoutes.organizationDetail(org.id)}
                      title={org.name}
                      subtitle={org.slug}
                    />
                  </td>
                  <td className={tableCellClass}>
                    <AdminHealthBadge health={org.health} />
                  </td>
                  <td className={tableCellClass}>
                    <AdminAccessBadge
                      isSuspended={org.isSuspended}
                      subscriptionStatus={org.subscriptionStatus}
                      providerSubscriptionId={org.providerSubscriptionId}
                      billingEnabled={billingEnabled}
                    />
                  </td>
                  <td className={tableCellClass}>
                    <AdminPlanBadge plan={org.subscriptionPlan} />
                  </td>
                  <td className={cn(tableCellClass, "text-muted-foreground")}>
                    {org.trialEnds
                      ? format(new Date(org.trialEnds), "d. MMM yyyy", {
                          locale: nb,
                        })
                      : "—"}
                  </td>
                  <td className={cn(tableCellClass, "tabular-nums")}>
                    {org.venueCount}
                  </td>
                  <td className={cn(tableCellClass, "font-semibold tabular-nums text-success")}>
                    {formatNok(org.totalRevenue)}
                  </td>
                  <td className={cn(tableCellClass, "text-muted-foreground")}>
                    {org.lastActivityAt
                      ? format(new Date(org.lastActivityAt), "d. MMM yyyy", {
                          locale: nb,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="space-y-3 px-6 py-16 text-center sm:px-10 sm:py-20 md:px-8">
                      <p className="font-heading text-lg font-bold tracking-tight text-rn-text-heading">
                        {organizations.length === 0
                          ? "Ingen organisasjoner ennå"
                          : "Ingen treff i listen"}
                      </p>
                      <p className="mx-auto max-w-lg text-muted-foreground">
                        {organizations.length === 0
                          ? "Nye organisasjoner vises her når de registrerer seg."
                          : "Juster søket eller bytt filter. Nullstill ved å velge «Alle» og tømme søkefeltet."}
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
            Viser {filtered.length} av {organizations.length} organisasjoner
            {selected.size > 0 ? (
              <span className="ml-2 font-medium text-foreground">
                · {selected.size} valgt
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspender {selected.size} organisasjoner?</DialogTitle>
            <DialogDescription className="app-text text-muted-foreground">
              Organisasjonene mister tilgang til appen inntil suspensjonen
              oppheves. Begrunnelse logges i revisjonsloggen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Begrunnelse</Label>
            <Input
              id="suspend-reason"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              placeholder="F.eks. manglende betaling"
              className="border-2 border-rn-border-strong"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <AdminActionButton
              type="button"
              disabled={busy}
              onClick={() => setSuspendOpen(false)}
            >
              Avbryt
            </AdminActionButton>
            <AdminActionButton
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleBulkSuspend()}
            >
              {busy ? "Suspenderer…" : "Suspender"}
            </AdminActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Utvid prøveperiode</DialogTitle>
            <DialogDescription className="app-text text-muted-foreground">
              Legger til dager på prøveperioden for {selected.size} valgte
              organisasjoner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="trial-days">Antall dager</Label>
            <Input
              id="trial-days"
              type="number"
              min={1}
              value={trialDays}
              onChange={(event) => setTrialDays(event.target.value)}
              className="border-2 border-rn-border-strong"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <AdminActionButton
              type="button"
              disabled={busy}
              onClick={() => setTrialOpen(false)}
            >
              Avbryt
            </AdminActionButton>
            <AdminActionButton
              type="button"
              disabled={busy}
              onClick={() => void handleBulkExtendTrial()}
            >
              {busy ? "Lagrer…" : "Utvid prøve"}
            </AdminActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
