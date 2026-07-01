"use client";

import { useTranslation } from "@/i18n/client";
import { AccommodationMonthCalendar } from "@/components/overnatting/accommodation-month-calendar";
import type {
  AccommodationReservationRow,
  AccommodationUnitRow,
} from "@/components/overnatting/types";
import { statusLabel } from "@/lib/navigation/nav-labels";
import type { AccommodationReservationStatus } from "@/lib/validations";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  FormSelect,
  FormSelectField,
  toIdNameOptions,
  toStringOptions,
} from "@/components/ui/form-select";
import { PropertySelectField } from "@/components/properties/property-select-field";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACCOMMODATION_RESERVATION_STATUSES,
  accommodationReservationEditSchema,
  accommodationUnitFormSchema,
  type AccommodationReservationEditInput,
  type AccommodationUnitFormInput,
} from "@/lib/validations";
import {
  accommodationTimeToInputValue,
} from "@/lib/accommodation-time";
import { formatAppDateFromParts } from "@/lib/format-datetime";
import {
  dayBeforeYmd,
  monthEndExclusiveYm,
  monthFirstDayYm,
  ymAdd,
} from "@/lib/overnatting-month";
import { computeAccommodationQuickStats } from "@/lib/overnatting/quick-stats";
import { RN_CARD_SHELL, RN_MODAL_FOOTER, RN_MODAL_MAX_HEIGHT, RN_MODAL_SCROLL_BODY } from "@/lib/rn-ui";
import {
  APP_TABLE_CELL_BODY,
  APP_TABLE_CELL_DATE,
  APP_TABLE_CELL_PRIMARY,
} from "@/lib/table-typography";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { nb } from "date-fns/locale/nb";
import { BedDouble, Building2, Calendar, Plus, RotateCcw, Search, Users, ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-app-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-app-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const labelClass =
  "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-app-xs";

const filterEyebrowClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

type AccommodationStatusFilter = "all" | "tentative" | "confirmed" | "cancelled";

function matchesAccommodationSearch(
  row: AccommodationReservationRow,
  query: string,
): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const blob = [row.customerName, row.unitName, row.notes ?? ""]
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

function matchesAccommodationDateRange(
  row: AccommodationReservationRow,
  fromYmd: string,
  toYmd: string,
): boolean {
  const start = row.checkInDate;
  const end = row.checkOutDate;

  if (fromYmd && toYmd) {
    const from = fromYmd <= toYmd ? fromYmd : toYmd;
    const to = fromYmd <= toYmd ? toYmd : fromYmd;
    return start <= to && end > from;
  }
  if (fromYmd) return end > fromYmd;
  if (toYmd) return start <= toYmd;
  return true;
}

const dialogSectionTitleClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function ymNow(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type RawRes = {
  id: string;
  unit_id: string;
  customer_id: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  guest_count: number;
  notes: string | null;
  total_price: number | null;
  customers: { name: string } | null;
  accommodation_units: { name: string } | null;
};

const UNKNOWN_CUSTOMER = "__unknown__";

function mapReservations(data: unknown): AccommodationReservationRow[] {
  return (
    (data as RawRes[] | null | undefined)?.map((r) => {
      const st = r.status;
      const ok =
        st === "tentative" || st === "confirmed" || st === "cancelled";
      return {
        id: r.id,
        unitId: r.unit_id,
        unitName: r.accommodation_units?.name ?? "—",
        customerId: r.customer_id,
        customerName: r.customers?.name?.trim() || UNKNOWN_CUSTOMER,
        checkInDate: r.check_in_date.slice(0, 10),
        checkOutDate: r.check_out_date.slice(0, 10),
        checkInTime:
          r.check_in_time != null && String(r.check_in_time).trim() !== ""
            ? String(r.check_in_time).trim()
            : null,
        checkOutTime:
          r.check_out_time != null && String(r.check_out_time).trim() !== ""
            ? String(r.check_out_time).trim()
            : null,
        status: ok ? st : "confirmed",
        guestCount: r.guest_count,
        notes: r.notes ?? null,
        totalPrice:
          r.total_price != null && Number.isFinite(Number(r.total_price))
            ? Number(r.total_price)
            : null,
      };
    }) ?? []
  );
}

export type OvernattingSectionProps = {
  units: AccommodationUnitRow[];
  initialReservations: AccommodationReservationRow[];
  initialYm: string;
  properties: { id: string; name: string }[];
  canManage: boolean;
  loadError: string | null;
  /** When true, skip client refetch on mount if month matches initialYm (server/React Query already loaded). */
  skipInitialReservationFetch?: boolean;
};

export function OvernattingSection({
  units: initialUnits,
  initialReservations,
  initialYm,
  properties,
  canManage,
  loadError,
  skipInitialReservationFetch = false,
}: OvernattingSectionProps) {
  const { t, formatCurrency, locale } = useTranslation();
  const dateLocale = locale === "nb" ? nb : enGB;
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateOvernatting } = useTenantDataInvalidation();
  const rid = useId().replace(/:/g, "");
  const [units, setUnits] = useState(initialUnits);
  const [monthYm, setMonthYm] = useState(initialYm || ymNow());
  const [reservations, setReservations] = useState(initialReservations);
  const [loadingRes, setLoadingRes] = useState(false);
  const skippedInitialReservationFetch = useRef(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<AccommodationUnitRow | null>(
    null,
  );
  const [editResOpen, setEditResOpen] = useState(false);
  const [editingRes, setEditingRes] =
    useState<AccommodationReservationRow | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] =
    useState<AccommodationUnitRow | null>(null);
  const [deleteResConfirmOpen, setDeleteResConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccommodationStatusFilter>("all");
  const [unitFilter, setUnitFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const unitForm = useForm<AccommodationUnitFormInput>({
    resolver: zodResolver(accommodationUnitFormSchema) as Resolver<
      AccommodationUnitFormInput
    >,
    defaultValues: {
      name: "",
      propertyId: "",
      maxGuests: 4,
      notes: "",
      active: true,
      sortOrder: 0,
    },
  });

  const editResForm = useForm<AccommodationReservationEditInput>({
    resolver: zodResolver(accommodationReservationEditSchema) as Resolver<
      AccommodationReservationEditInput,
      unknown,
      AccommodationReservationEditInput
    >,
    defaultValues: {
      unitId: "",
      checkInDate: "",
      checkOutDate: "",
      checkInTime: "",
      checkOutTime: "",
      guestCount: 2,
      status: "confirmed",
      notes: "",
      totalPrice: undefined,
    },
  });

  const fetchReservations = useCallback(async () => {
    if (!supabase) return;
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch {
      return;
    }
    const monthStart = monthFirstDayYm(monthYm);
    const endEx = monthEndExclusiveYm(monthYm);
    if (!monthStart || !endEx) return;
    const prevStart = monthFirstDayYm(ymAdd(monthYm, -1));
    const beforeFetch = prevStart ? dayBeforeYmd(prevStart) : "";
    if (!beforeFetch) return;
    setLoadingRes(true);
    const { data, error } = await supabase
      .from("accommodation_reservations")
      .select(
        "id, unit_id, customer_id, check_in_date, check_out_date, check_in_time, check_out_time, status, guest_count, notes, total_price, customers(name), accommodation_units(name)",
      )
      .eq("organization_id", orgId)
      .lt("check_in_date", endEx)
      .gt("check_out_date", beforeFetch);
    setLoadingRes(false);
    if (error) {
      toast.error(t("overnatting.fetchFailed"), {
        description: error.message,
      });
      return;
    }
    setReservations(mapReservations(data));
  }, [supabase, monthYm, currentOrganizationId]);

  useEffect(() => {
    if (
      skipInitialReservationFetch &&
      !skippedInitialReservationFetch.current &&
      monthYm === initialYm
    ) {
      skippedInitialReservationFetch.current = true;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch reservations when month/org changes
    void fetchReservations();
  }, [fetchReservations, initialYm, monthYm, skipInitialReservationFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server-provided reservations
    setReservations(initialReservations);
  }, [initialReservations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server-provided units into editable local state
    setUnits(initialUnits);
  }, [initialUnits]);

  const sortedUnits = useMemo(
    () =>
      [...units].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [units],
  );

  const monthLabel = useMemo(() => {
    const f = monthFirstDayYm(monthYm);
    if (!f) return monthYm;
    return format(new Date(`${f}T12:00:00`), "MMMM yyyy", { locale: dateLocale });
  }, [monthYm, dateLocale]);

  function openNewUnit() {
    setEditingUnit(null);
    unitForm.reset({
      name: "",
      propertyId: "",
      maxGuests: 4,
      notes: "",
      active: true,
      sortOrder: 0,
    });
    setUnitDialogOpen(true);
  }

  function openEditUnit(u: AccommodationUnitRow) {
    setEditingUnit(u);
    unitForm.reset({
      name: u.name,
      propertyId: u.propertyId ?? "",
      maxGuests: u.maxGuests,
      notes: u.notes ?? "",
      active: u.active,
      sortOrder: u.sortOrder,
    });
    setUnitDialogOpen(true);
  }

  async function onSaveUnit(data: AccommodationUnitFormInput) {
    if (!supabase || !canManage) return;
    const payload = {
      name: data.name.trim(),
      property_id: data.propertyId || null,
      max_guests: data.maxGuests,
      notes: data.notes?.trim() || null,
      active: data.active,
      sort_order: data.sortOrder ?? 0,
    };
    if (editingUnit) {
      const { error } = await supabase
        .from("accommodation_units")
        .update(payload)
        .eq("id", editingUnit.id);
      if (error) {
        toast.error(t("overnatting.updateUnitFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("overnatting.unitUpdated"));
    } else {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
        );
        return;
      }

      const { error } = await supabase.from("accommodation_units").insert({
        ...payload,
        organization_id: orgId,
      });
      if (error) {
        toast.error(t("overnatting.createUnitFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("overnatting.unitCreated"));
    }
    setUnitDialogOpen(false);
    invalidateOvernatting();
  }

  async function confirmDeleteUnit() {
    if (!supabase || !canManage || !deleteUnitTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("accommodation_units")
        .delete()
        .eq("id", deleteUnitTarget.id);
      if (error) {
        toast.error(t("common.toasts.deleteFailed"), { description: error.message });
        return;
      }
      toast.success(t("overnatting.unitDeleted"));
      setDeleteUnitTarget(null);
      invalidateOvernatting();
    } finally {
      setDeleteBusy(false);
    }
  }

  function openEditRes(r: AccommodationReservationRow) {
    setEditingRes(r);
    editResForm.reset({
      unitId: r.unitId,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
      checkInTime: accommodationTimeToInputValue(r.checkInTime),
      checkOutTime: accommodationTimeToInputValue(r.checkOutTime),
      guestCount: r.guestCount,
      status: r.status,
      notes: r.notes ?? "",
      totalPrice: r.totalPrice ?? undefined,
    });
    setEditResOpen(true);
  }

  async function onSaveEditRes(data: AccommodationReservationEditInput) {
    if (!supabase || !canManage || !editingRes) return;
    const { error } = await supabase
      .from("accommodation_reservations")
      .update({
        unit_id: data.unitId,
        check_in_date: data.checkInDate,
        check_out_date: data.checkOutDate,
        check_in_time: data.checkInTime === "" ? null : data.checkInTime,
        check_out_time: data.checkOutTime === "" ? null : data.checkOutTime,
        guest_count: data.guestCount,
        status: data.status,
        notes: data.notes?.trim() || null,
        total_price:
          data.totalPrice === undefined || Number.isNaN(data.totalPrice)
            ? null
            : data.totalPrice,
      })
      .eq("id", editingRes.id);
    if (error) {
      toast.error(t("overnatting.saveFailed"), { description: error.message });
      return;
    }
    toast.success(t("overnatting.reservationUpdated"));
    setEditResOpen(false);
    void fetchReservations();
    invalidateOvernatting();
  }

  async function confirmDeleteReservation() {
    if (!supabase || !canManage || !editingRes) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("accommodation_reservations")
        .delete()
        .eq("id", editingRes.id);
      if (error) {
        toast.error(t("common.toasts.deleteFailed"), { description: error.message });
        return;
      }
      toast.success(t("overnatting.reservationDeleted"));
      setDeleteResConfirmOpen(false);
      setEditResOpen(false);
      setEditingRes(null);
      void fetchReservations();
      invalidateOvernatting();
    } finally {
      setDeleteBusy(false);
    }
  }

  const resInMonth = useMemo(
    () =>
      reservations.filter((r) => {
        const ms = monthFirstDayYm(monthYm);
        const me = monthEndExclusiveYm(monthYm);
        if (!ms || !me) return false;
        const bm = dayBeforeYmd(ms);
        if (!bm) return false;
        return r.checkInDate < me && r.checkOutDate > bm;
      }),
    [reservations, monthYm],
  );

  const filterCounts = useMemo(
    () => ({
      all: resInMonth.length,
      tentative: resInMonth.filter((r) => r.status === "tentative").length,
      confirmed: resInMonth.filter((r) => r.status === "confirmed").length,
      cancelled: resInMonth.filter((r) => r.status === "cancelled").length,
    }),
    [resInMonth],
  );

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    unitFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const filteredReservations = useMemo(() => {
    let rows = resInMonth;
    if (query.trim()) {
      rows = rows.filter((r) => matchesAccommodationSearch(r, query));
    }
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (unitFilter) {
      rows = rows.filter((r) => r.unitId === unitFilter);
    }
    if (dateFrom || dateTo) {
      rows = rows.filter((r) =>
        matchesAccommodationDateRange(r, dateFrom, dateTo),
      );
    }
    return rows;
  }, [resInMonth, query, statusFilter, unitFilter, dateFrom, dateTo]);

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setUnitFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const activeUnitCount = useMemo(
    () => sortedUnits.filter((u) => u.active).length,
    [sortedUnits],
  );

  const quickStats = useMemo(
    () =>
      computeAccommodationQuickStats(reservations, activeUnitCount, monthYm),
    [reservations, activeUnitCount, monthYm],
  );

  const trendPositive =
    quickStats.monthOverMonthPct != null && quickStats.monthOverMonthPct >= 0;

  return (
    <div className="overnatting-page-workspace mx-auto flex w-full flex-col gap-8 pb-24 md:pb-8">
      <div className={cn("min-w-0 overflow-hidden", RN_CARD_SHELL)}>
        <div className="border-b-2 border-rn-border-strong bg-card/80 px-[length:var(--app-card-padding)] py-6 md:py-7">
          <AppPageHeader
            className="mb-0 gap-3 md:gap-4"
            surface="default"
            title={t("overnatting.title")}
            actionsClassName="justify-end"
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {canManage ? (
                  <Link
                    href="/app/overnatting/new"
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "inline-flex items-center justify-center gap-2",
                    )}
                  >
                    <Plus className="size-5" aria-hidden />
                    {t("overnatting.new")}
                  </Link>
                ) : null}
                {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="cta"
                    className="gap-2 border-2 border-rn-border-strong font-semibold"
                    onClick={openNewUnit}
                  >
                    <BedDouble className="size-5" aria-hidden />
                    {t("overnatting.newUnit")}
                  </Button>
                ) : null}
                {!loadError ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="cta"
                    className="gap-2 border-2 border-rn-border-strong font-semibold"
                    aria-expanded={calendarOpen}
                    onClick={() => setCalendarOpen((v) => !v)}
                  >
                    <Calendar className="size-5 shrink-0" aria-hidden />
                    {calendarOpen ? t("overnatting.hideCalendar") : t("overnatting.showCalendar")}
                  </Button>
                ) : null}
              </div>
            }
          />
        </div>

        {loadError ? (
          <div
            className="border-t border-rn-border-strong/50 px-4 py-4 sm:px-5 lg:px-6"
            role="alert"
          >
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
              {t("overnatting.loadError", { error: loadError })}
            </div>
          </div>
        ) : null}

        {!loadError && calendarOpen ? (
          <div className="border-t border-rn-border-strong/50 bg-gradient-to-b from-muted/10 to-transparent px-4 py-3 sm:px-5 lg:px-6">
            <div
              className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2"
              role="toolbar"
              aria-label={t("overnatting.availabilityLegend")}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("overnatting.availability")}
                </span>
                {loadingRes ? (
                  <span className="text-app-xs font-medium text-muted-foreground">
                    {t("overnatting.updating")}
                  </span>
                ) : null}
              </div>
              <div className="flex min-w-0 max-sm:basis-full flex-wrap items-center justify-end gap-2 sm:shrink-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-rn-border-strong/50 bg-card px-3 py-1.5 text-app-xs font-medium text-rn-text-body shadow-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full bg-emerald-500/90 ring-2 ring-emerald-500/25 shadow-sm dark:bg-emerald-400"
                    aria-hidden
                  />
                  {statusLabel("confirmed", t)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-rn-border-strong/50 bg-card px-3 py-1.5 text-app-xs font-medium text-rn-text-body shadow-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full bg-amber-500/90 ring-2 ring-amber-500/25 shadow-sm dark:bg-amber-400"
                    aria-hidden
                  />
                  {statusLabel("tentative", t)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-rn-border-strong/50 bg-card px-3 py-1.5 text-app-xs font-medium text-rn-text-body shadow-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full bg-rose-500/90 ring-2 ring-rose-500/25 shadow-sm dark:bg-rose-400"
                    aria-hidden
                  />
                  {t("overnatting.cancelledEmpty")}
                </span>
              </div>
            </div>
            <AccommodationMonthCalendar
              reservations={reservations}
              monthYm={monthYm}
              onMonthChange={setMonthYm}
              canManage={canManage}
              onSelectReservation={openEditRes}
              hasUnits={sortedUnits.length > 0}
            />
          </div>
        ) : null}

        {!loadError && sortedUnits.length > 0 ? (
          <div className="border-t border-rn-border-strong/40 bg-linear-to-b from-muted/15 to-transparent px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("overnatting.title")}
                </p>
                <h3 className="mt-1 font-heading text-app-lg font-bold tracking-tight text-rn-text-heading md:text-app-xl">
                  {t("overnatting.units")}
                </h3>
                <p className="mt-1 max-w-xl text-app-sm leading-snug text-muted-foreground">
                  {sortedUnits.length}{" "}
                  {sortedUnits.length === 1
                    ? t("overnatting.unitSingular")
                    : t("overnatting.unitPlural")}{" "}
                  {t("overnatting.unitsAvailableSuffix")}
                  {canManage ? t("overnatting.manageUnitsHint") : null}
                </p>
              </div>
            </div>

            <ul
              className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              aria-label={t("overnatting.unitsListAria")}
            >
              {sortedUnits.map((u) => (
                <li key={u.id}>
                  <div
                    className={cn(
                      "flex h-full flex-col rounded-[length:var(--app-radius)] border-2 bg-card p-4 shadow-sm transition-[box-shadow, border-color] sm:p-5",
                      u.active
                        ? "border-rn-border-strong/55 hover:border-rn-border-strong hover:shadow-md"
                        : "border-dashed border-rn-border-strong/45 bg-muted/20 opacity-90 hover:border-rn-border-strong/70",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-[length:var(--app-radius)] border border-rn-border-strong/35 bg-rn-surface-wash/80 shadow-sm",
                          !u.active && "grayscale-[0.35]",
                        )}
                        aria-hidden
                      >
                        <BedDouble className="size-5 text-rn-text-heading" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <span className="font-heading text-app-base font-bold leading-tight text-rn-text-heading">
                            {u.name}
                          </span>
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              u.active
                                ? "border-success/35 bg-success/10 text-success"
                                : "border-muted-foreground/30 bg-muted text-muted-foreground",
                            )}
                          >
                            {u.active ? t("statuses.active") : t("statuses.inactive")}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-col gap-1.5 text-app-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Users
                              className="size-3.5 shrink-0 text-rn-text-body/80"
                              aria-hidden
                            />
                            <span>
                              {t("overnatting.maxGuests", { count: u.maxGuests })}
                            </span>
                          </span>
                          {u.propertyName ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Building2
                                className="size-3.5 shrink-0 text-rn-text-body/80"
                                aria-hidden
                              />
                              <span className="min-w-0 truncate text-foreground/85">
                                {u.propertyName}
                              </span>
                            </span>
                          ) : null}
                        </div>
                        {u.notes?.trim() ? (
                          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground italic">
                            {u.notes.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-rn-border-strong/30 pt-3 sm:mt-5 sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-2 border-rn-border-strong/70 font-semibold"
                          onClick={() => openEditUnit(u)}
                        >
                          {t("common.actions.edit")}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="font-semibold"
                          onClick={() => setDeleteUnitTarget(u)}
                        >
                          {t("common.actions.delete")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loadError ? (
          <div className="border-t-2 border-rn-border-strong px-4 py-6 sm:px-5 lg:px-6">
            <h2 className="font-heading text-app-lg font-bold capitalize text-rn-text-heading md:text-app-xl">
              {t("overnatting.reservationsMonth", { month: monthLabel })}
            </h2>

            <section
              className="overnatting-list-filters mt-4"
              aria-label={t("overnatting.filterReservationsAria")}
            >
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:gap-5">
                  <div className="relative min-w-0 w-full xl:max-w-md 2xl:max-w-xl">
                    <Label htmlFor={`${rid}-res-search`} className={filterEyebrowClass}>
                      {t("common.actions.search")}
                    </Label>
                    <Search
                      className="pointer-events-none absolute top-[calc(50%+0.625rem)] left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
                      aria-hidden
                    />
                    <Input
                      id={`${rid}-res-search`}
                      aria-label={t("overnatting.searchAria")}
                      className="overnatting-list-search h-12 w-full rounded-md border-2 border-rn-border-strong bg-background pl-12 text-app-base text-foreground shadow-sm md:h-14 md:pl-14 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                      placeholder={t("overnatting.searchPlaceholder")}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                    />
                  </div>

                  <div className="min-w-0 w-full flex-1">
                    <p className={filterEyebrowClass}>{t("common.fields.status")}</p>
                    <div
                      className="grid min-w-0 w-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
                      role="group"
                      aria-label={t("overnatting.filterStatusAria")}
                    >
                      {(
                        [
                          ["all", t("common.actions.all"), filterCounts.all, null],
                          [
                            "confirmed",
                            statusLabel("confirmed", t),
                            filterCounts.confirmed,
                            "emerald",
                          ],
                          [
                            "tentative",
                            statusLabel("tentative", t),
                            filterCounts.tentative,
                            "amber",
                          ],
                          [
                            "cancelled",
                            statusLabel("cancelled", t),
                            filterCounts.cancelled,
                            "rose",
                          ],
                        ] as const
                      ).map(([key, label, count, tone]) => {
                        const active = statusFilter === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            className={cn(
                              "flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-md border-2 px-3 py-3 text-left transition-all sm:gap-3 sm:px-4 md:min-h-[3.25rem] md:rounded-md md:px-4 md:py-3.5",
                              active
                                ? "border-rn-accent-border bg-success !text-white shadow-md [&_svg]:!text-white"
                                : tone === "emerald"
                                  ? "border-emerald-400/90 bg-card text-emerald-950 hover:border-emerald-500 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/40"
                                  : tone === "amber"
                                    ? "border-amber-400/90 bg-card text-amber-950 hover:border-amber-500 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950/40"
                                    : tone === "rose"
                                      ? "border-red-400/90 bg-card text-red-950 hover:border-red-500 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-950/40"
                                      : "border-rn-border-strong bg-card text-foreground hover:border-rn-border-strong-hover hover:bg-rn-surface-wash",
                            )}
                          >
                            <span
                              className={cn(
                                "truncate font-heading text-app-sm font-semibold sm:text-app-base",
                                active ? "!text-white" : undefined,
                              )}
                            >
                              {label}
                            </span>
                            <span
                              className={cn(
                                "overnatting-list-filter-count inline-flex shrink-0 min-w-[1.75rem] items-center justify-center rounded-md border px-2 py-0.5 text-app-sm font-bold tabular-nums",
                                active
                                  ? "border-white/30 bg-white/20 !text-white"
                                  : "border-rn-badge-border bg-rn-badge-surface text-rn-text-ink",
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                  <div className="min-w-0">
                    <Label htmlFor={`${rid}-res-unit`} className={filterEyebrowClass}>
                      {t("overnatting.tableUnit")}
                    </Label>
                    <FormSelect
                      id={`${rid}-res-unit`}
                      value={unitFilter}
                      onValueChange={setUnitFilter}
                      aria-label={t("overnatting.filterUnitAria")}
                      className="h-11 min-h-11 w-full text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
                      placeholder={t("overnatting.allUnits")}
                      options={toIdNameOptions(sortedUnits)}
                    />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor={`${rid}-res-from`} className={filterEyebrowClass}>
                      {t("overnatting.dateFrom")}
                    </Label>
                    <DatePickerField
                      id={`${rid}-res-from`}
                      value={dateFrom}
                      onChange={setDateFrom}
                      maxYmd={dateTo || undefined}
                      variant="toolbar"
                      className="h-11 min-h-11 w-full text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor={`${rid}-res-to`} className={filterEyebrowClass}>
                      {t("overnatting.dateTo")}
                    </Label>
                    <DatePickerField
                      id={`${rid}-res-to`}
                      value={dateTo}
                      onChange={setDateTo}
                      minYmd={dateFrom || undefined}
                      variant="toolbar"
                      className="h-11 min-h-11 w-full text-app-sm sm:h-12 sm:min-h-12 sm:text-app-base"
                    />
                  </div>
                  <div className="flex min-w-0 sm:col-span-2 lg:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!hasActiveFilters}
                      className="h-11 w-full gap-2 rounded-md border-2 border-rn-border-strong px-4 font-heading text-app-sm font-semibold sm:h-12 sm:text-app-base"
                      onClick={resetFilters}
                    >
                      <RotateCcw className="size-4 shrink-0" aria-hidden />
                      {t("overnatting.resetFilters")}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-4 overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="border-rn-border-strong/50 bg-rn-surface-table-head hover:bg-rn-surface-table-head">
                    <TableHead>{t("overnatting.tableCustomer")}</TableHead>
                    <TableHead>{t("overnatting.tableUnit")}</TableHead>
                    <TableHead>{t("overnatting.tableArrival")}</TableHead>
                    <TableHead>{t("overnatting.tableDeparture")}</TableHead>
                    <TableHead>{t("overnatting.tableGuests")}</TableHead>
                    <TableHead>{t("common.fields.status")}</TableHead>
                    {canManage ? (
                      <TableHead className="text-right">{t("overnatting.tableActions")}</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 7 : 6}
                        className="text-rn-text-body"
                      >
                        {resInMonth.length === 0
                          ? t("overnatting.emptyMonth")
                          : hasActiveFilters
                            ? t("overnatting.emptyFiltered")
                            : t("overnatting.emptyMonth")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReservations.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className={APP_TABLE_CELL_PRIMARY}>
                          {r.customerName === UNKNOWN_CUSTOMER
                            ? t("overnatting.unknownCustomer")
                            : r.customerName}
                        </TableCell>
                        <TableCell className={APP_TABLE_CELL_BODY}>{r.unitName}</TableCell>
                        <TableCell className={APP_TABLE_CELL_DATE}>
                          {formatAppDateFromParts(r.checkInDate, r.checkInTime, locale)}
                        </TableCell>
                        <TableCell className={APP_TABLE_CELL_DATE}>
                          {formatAppDateFromParts(r.checkOutDate, r.checkOutTime, locale)}
                        </TableCell>
                        <TableCell className={cn(APP_TABLE_CELL_BODY, "tabular-nums")}>
                          {r.guestCount}
                        </TableCell>
                        <TableCell className={APP_TABLE_CELL_BODY}>
                          {statusLabel(r.status, t)}
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditRes(r)}
                            >
                              {t("common.actions.edit")}
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </div>

      {!loadError ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
          <div className="flex min-w-0 flex-col justify-between rounded-md border-2 border-rn-accent-border bg-success p-7 text-white shadow-rn-hero-success md:p-9">
            <div className="min-w-0">
              <div className="mb-5 flex size-12 items-center justify-center rounded-md border border-white/20 bg-white/12 md:size-14">
                <TrendingUp className="size-6 md:size-7" aria-hidden />
              </div>
              <h2 className="font-heading text-app-xl font-bold leading-snug text-white md:text-app-2xl">
                {t("overnatting.monthlyRevenue")}
              </h2>
              <p className="mt-3 text-app-sm leading-relaxed text-white/90 md:text-app-base">
                {t("overnatting.revenueDescription", {
                  month: quickStats.monthLabel,
                  prevMonth: quickStats.prevMonthLabel,
                })}
              </p>
            </div>
            <div className="mt-10 min-w-0">
              <div className="break-words text-app-3xl font-black leading-none tracking-tight md:text-app-3xl">
                {formatCurrency(quickStats.currentMonthRevenue)}
              </div>
              {quickStats.monthOverMonthPct != null ? (
                <div
                  className={cn(
                    "mt-4 flex items-center gap-2 text-app-sm font-bold md:text-app-base",
                    trendPositive ? "text-emerald-200" : "text-rose-200",
                  )}
                >
                  {trendPositive ? (
                    <ArrowUpRight className="size-4 shrink-0 md:size-5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-4 shrink-0 md:size-5" aria-hidden />
                  )}
                  <span>
                    {t("overnatting.percentFromPrevMonth", {
                      sign: trendPositive ? "+" : "",
                      percent: quickStats.monthOverMonthPct
                        .toFixed(1)
                        .replace(".", locale === "nb" ? "," : "."),
                    })}
                  </span>
                </div>
              ) : (
                <p className="mt-4 text-app-sm font-medium text-white/75 md:text-app-base">
                  {t("overnatting.noComparison")}
                </p>
              )}
              <p className="mt-3 text-app-sm text-white/70">
                {t("overnatting.prevMonth")}: {formatCurrency(quickStats.prevMonthRevenue)}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col gap-8 md:col-span-2 md:flex-row md:gap-10",
              RN_CARD_SHELL,
              "p-7 md:p-9",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                  <p className="mb-3 text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-app-sm">
                    {t("overnatting.occupancyRate")}
                  </p>
                  <p className="dashboard-kpi-value font-extrabold text-rn-text-heading tabular-nums md:text-app-3xl">
                    {quickStats.occupancyPct}%
                  </p>
                  <p className="mt-3 text-app-base leading-snug text-muted-foreground md:text-app-lg">
                    {t("overnatting.occupancyDescription")}
                  </p>
                </div>
                <div className="rounded-md border-2 border-rn-border-strong bg-rn-surface-segment p-5 md:p-6">
                  <p className="mb-3 text-app-xs font-semibold tracking-wider text-muted-foreground uppercase md:text-app-sm">
                    {t("overnatting.avgGuests")}
                  </p>
                  <p className="dashboard-kpi-value font-extrabold text-rn-text-heading tabular-nums md:text-app-3xl">
                    {quickStats.avgGuestsActive ?? "—"}
                  </p>
                  <p className="mt-3 text-app-base text-muted-foreground md:text-app-lg">
                    {t("overnatting.perReservation")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col justify-between rounded-md border-2 border-success/50 bg-gradient-to-b from-rn-surface-gradient-from to-muted p-6 md:w-[38%] md:max-w-[340px] md:p-8">
              <div>
                <p className="text-app-xs font-semibold tracking-wider text-success uppercase dark:!text-white md:text-app-sm">
                  {quickStats.monthLabel}
                </p>
                <p className="mt-3 dashboard-kpi-value text-success dark:!text-white md:text-app-3xl">
                  {formatCurrency(quickStats.currentMonthRevenue)}
                </p>
              </div>
              <div className="mt-8 space-y-3 border-t-2 border-success/20 pt-5">
                <div className="flex justify-between text-app-base md:text-app-lg">
                  <span className="font-medium text-rn-text-body">
                    {t("overnatting.prevMonth")}
                  </span>
                  <span className="font-bold tabular-nums text-rn-text-heading">
                    {formatCurrency(quickStats.prevMonthRevenue)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-rn-border-strong/40 bg-muted">
                  <div
                    className="h-full rounded-full bg-success transition-[width]"
                    style={{
                      width: (() => {
                        const { currentMonthRevenue: c, prevMonthRevenue: p } =
                          quickStats;
                        if (c + p === 0) return "0%";
                        const max = Math.max(c, p, 1);
                        return `${Math.min(100, Math.round((c / max) * 100))}%`;
                      })(),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-lg border-2 border-rn-border-strong" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingUnit ? t("overnatting.editUnit") : t("overnatting.newUnitTitle")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void unitForm.handleSubmit(onSaveUnit)();
            }}
          >
            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-uname`}>
                {t("common.fields.name")}
              </Label>
              <Input
                id={`${rid}-uname`}
                className={fieldClass}
                {...unitForm.register("name")}
              />
              {unitForm.formState.errors.name ? (
                <p className="text-app-sm text-destructive">
                  {unitForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-p`}>
                {t("overnatting.propertyOptional")}
              </Label>
              <PropertySelectField
                name="propertyId"
                control={unitForm.control}
                id={`${rid}-p`}
                className={cn(fieldClass, "font-medium")}
                optional
                placeholder={t("overnatting.noPropertyLink")}
                properties={properties}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={labelClass} htmlFor={`${rid}-mg`}>
                  {t("overnatting.maxGuestsLabel")}
                </Label>
                <Input
                  id={`${rid}-mg`}
                  type="number"
                  min={1}
                  className={fieldClass}
                  {...unitForm.register("maxGuests")}
                />
                {unitForm.formState.errors.maxGuests ? (
                  <p className="text-app-sm text-destructive">
                    {unitForm.formState.errors.maxGuests.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className={labelClass} htmlFor={`${rid}-so`}>
                  {t("overnatting.sortOrder")}
                </Label>
                <Input
                  id={`${rid}-so`}
                  type="number"
                  min={0}
                  className={fieldClass}
                  {...unitForm.register("sortOrder")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-unote`}>
                {t("common.fields.notes")}
              </Label>
              <Textarea
                id={`${rid}-unote`}
                className="rounded-md border-2 border-rn-border-strong bg-background p-3"
                rows={2}
                {...unitForm.register("notes")}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-app-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-2 border-rn-border-strong"
                {...unitForm.register("active")}
              />
              {t("overnatting.activeForBooking")}
            </label>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnitDialogOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" variant="success">
                {t("common.actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editResOpen} onOpenChange={setEditResOpen}>
        <DialogContent
          className={cn(
            "max-w-lg gap-0 overflow-hidden border-2 border-rn-border-strong p-0 sm:max-w-xl",
            RN_MODAL_MAX_HEIGHT,
            "flex flex-col",
          )}
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-rn-border-strong/50 px-6 pb-4 pt-6 sm:px-8">
            <DialogTitle className="font-heading text-app-lg md:text-app-xl">
              {t("overnatting.editReservation")}
            </DialogTitle>
          </DialogHeader>
          {editingRes ? (
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                void editResForm.handleSubmit(onSaveEditRes)();
              }}
            >
              <div className={cn(RN_MODAL_SCROLL_BODY, "space-y-5 px-6 py-5 sm:px-8")}>
                <div className="rounded-md border border-rn-border-strong/45 bg-muted/25 px-3.5 py-3">
                  <p className={dialogSectionTitleClass}>{t("overnatting.customerSection")}</p>
                  <p className="mt-1 font-heading text-app-base font-semibold text-rn-text-heading">
                    {editingRes.customerName === UNKNOWN_CUSTOMER
                      ? t("overnatting.unknownCustomer")
                      : editingRes.customerName}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-erun`}>
                    {t("overnatting.tableUnit")}
                  </Label>
                  <FormSelectField
                    name="unitId"
                    control={editResForm.control}
                    id={`${rid}-erun`}
                    className={cn(fieldClass, "font-medium")}
                    options={sortedUnits.map((u) => ({
                      value: u.id,
                      label: t("overnatting.unitMaxGuests", {
                        name: u.name,
                        count: u.maxGuests,
                      }),
                    }))}
                  />
                  {editResForm.formState.errors.unitId ? (
                    <p className="text-app-sm text-destructive">
                      {editResForm.formState.errors.unitId.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-md border-2 border-rn-border-strong/40 bg-rn-surface-wash/25 p-4 sm:p-5">
                  <div className="space-y-1">
                    <p className={dialogSectionTitleClass}>{t("overnatting.timeSection")}</p>
                    <p className="text-app-xs leading-snug text-muted-foreground">
                      {t("overnatting.timeSectionHint")}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className={labelClass} htmlFor={`${rid}-ercid`}>
                        {t("overnatting.tableArrival")}
                      </Label>
                      <Controller
                        name="checkInDate"
                        control={editResForm.control}
                        render={({ field }) => (
                          <DatePickerField
                            id={`${rid}-ercid`}
                            variant="toolbar"
                            className={cn(fieldClass, "shadow-sm")}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      {editResForm.formState.errors.checkInDate ? (
                        <p className="text-app-sm text-destructive">
                          {editResForm.formState.errors.checkInDate.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClass} htmlFor={`${rid}-ercod`}>
                        {t("overnatting.tableDeparture")}
                      </Label>
                      <Controller
                        name="checkOutDate"
                        control={editResForm.control}
                        render={({ field }) => (
                          <DatePickerField
                            id={`${rid}-ercod`}
                            variant="toolbar"
                            className={cn(fieldClass, "shadow-sm")}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        )}
                      />
                      {editResForm.formState.errors.checkOutDate ? (
                        <p className="text-app-sm text-destructive">
                          {editResForm.formState.errors.checkOutDate.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClass} htmlFor={`${rid}-ercit`}>
                        {t("overnatting.checkIn")}{" "}
                        <span className="font-normal normal-case text-muted-foreground">
                          {t("overnatting.optional")}
                        </span>
                      </Label>
                      <Input
                        id={`${rid}-ercit`}
                        type="time"
                        step={60}
                        className={fieldClass}
                        {...editResForm.register("checkInTime")}
                      />
                      {editResForm.formState.errors.checkInTime ? (
                        <p className="text-app-sm text-destructive">
                          {editResForm.formState.errors.checkInTime.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label className={labelClass} htmlFor={`${rid}-ercot`}>
                        {t("overnatting.checkOut")}{" "}
                        <span className="font-normal normal-case text-muted-foreground">
                          {t("overnatting.optional")}
                        </span>
                      </Label>
                      <Input
                        id={`${rid}-ercot`}
                        type="time"
                        step={60}
                        className={fieldClass}
                        {...editResForm.register("checkOutTime")}
                      />
                      {editResForm.formState.errors.checkOutTime ? (
                        <p className="text-app-sm text-destructive">
                          {editResForm.formState.errors.checkOutTime.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor={`${rid}-rg`}>
                      {t("overnatting.tableGuests")}
                    </Label>
                    <Input
                      id={`${rid}-rg`}
                      type="number"
                      min={1}
                      className={fieldClass}
                      {...editResForm.register("guestCount")}
                    />
                    {editResForm.formState.errors.guestCount ? (
                      <p className="text-app-sm text-destructive">
                        {editResForm.formState.errors.guestCount.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label className={labelClass} htmlFor={`${rid}-rst`}>
                      {t("common.fields.status")}
                    </Label>
                    <FormSelectField
                      name="status"
                      control={editResForm.control}
                      id={`${rid}-rst`}
                      className={cn(fieldClass, "font-medium")}
                      options={toStringOptions(
                        ACCOMMODATION_RESERVATION_STATUSES,
                        (s) => statusLabel(s as AccommodationReservationStatus, t),
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-rp`}>
                    {t("overnatting.totalPriceOptional")}{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      {t("overnatting.optional")}
                    </span>
                  </Label>
                  <PriceInput
                    id={`${rid}-rp`}
                    step="0.01"
                    className={fieldClass}
                    {...editResForm.register("totalPrice")}
                  />
                  {editResForm.formState.errors.totalPrice ? (
                    <p className="text-app-sm text-destructive">
                      {editResForm.formState.errors.totalPrice.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-rn`}>
                    {t("common.fields.notes")}
                  </Label>
                  <Textarea
                    id={`${rid}-rn`}
                    rows={3}
                    className="rounded-md border-2 border-rn-border-strong bg-background p-3 text-app-sm focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25 md:text-app-base"
                    {...editResForm.register("notes")}
                  />
                </div>
              </div>

              <DialogFooter
                className={cn(
                  RN_MODAL_FOOTER,
                  "mx-0 mb-0 mt-0 flex flex-col gap-3 rounded-b-[length:var(--app-radius)] border-t border-rn-border-strong/50 bg-muted/25 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:py-4",
                )}
              >
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => setDeleteResConfirmOpen(true)}
                >
                  {t("overnatting.deleteReservation")}
                </Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setEditResOpen(false)}
                  >
                    {t("common.actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    className="w-full sm:w-auto"
                  >
                    {t("common.actions.save")}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteUnitTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteUnitTarget(null);
        }}
        title={t("overnatting.deleteUnitTitle")}
        description={
          deleteUnitTarget
            ? t("overnatting.deleteUnitDescription", { name: deleteUnitTarget.name })
            : null
        }
        confirmLabel={t("overnatting.confirmDeleteUnit")}
        busy={deleteBusy}
        onConfirm={confirmDeleteUnit}
      />

      <ConfirmDeleteDialog
        open={deleteResConfirmOpen}
        onOpenChange={setDeleteResConfirmOpen}
        title={t("overnatting.deleteReservationTitle")}
        description={
          editingRes
            ? t("overnatting.deleteReservationDescription", {
                customer:
                  editingRes.customerName === UNKNOWN_CUSTOMER
                    ? t("overnatting.unknownCustomer")
                    : editingRes.customerName,
              })
            : null
        }
        confirmLabel={t("overnatting.confirmDeleteReservation")}
        busy={deleteBusy}
        onConfirm={confirmDeleteReservation}
      />
    </div>
  );
}
