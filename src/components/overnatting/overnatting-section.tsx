"use client";

import { useTranslation } from "@/i18n/client";
import { AccommodationMonthCalendar } from "@/components/overnatting/accommodation-month-calendar";
import {
  UNKNOWN_CUSTOMER,
  type AccommodationReservationRow,
  type AccommodationUnitRow,
} from "@/components/overnatting/types";
import { statusLabel } from "@/lib/navigation/nav-labels";
import type { AccommodationReservationStatus } from "@/lib/validations";
import { usePageSearch } from "@/providers/page-search-provider";
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
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { DataTable } from "@/components/ui/data-table";
import { ReservationStatusBadge, buildReservationColumns } from "@/components/overnatting/reservation-columns";
import { StatCard } from "@/components/ui/stat-card";
import { statusDotClass } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
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
import { RN_MODAL_FOOTER, RN_MODAL_MAX_HEIGHT, RN_MODAL_SCROLL_BODY, RN_OUTLINE_BUTTON } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { nb } from "date-fns/locale/nb";
import {
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Percent,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-12 w-full rounded-xl border border-foreground/25 bg-background px-4 text-app-base text-foreground shadow-none outline-none transition-colors hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

const labelClass = "text-[13px] font-semibold text-foreground md:text-sm";

const filterEyebrowClass = "mb-1.5 block text-[13px] font-semibold text-foreground";

const cardClass = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";

const filterFieldClass =
  "h-11 min-h-11 w-full rounded-xl border border-foreground/25 text-app-sm shadow-none sm:h-12 sm:min-h-12 sm:text-app-base";

const outlineBtnClass = RN_OUTLINE_BUTTON;

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

const dialogSectionTitleClass = "text-xs font-semibold text-muted-foreground";

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
  const { query, setQuery } = usePageSearch();
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
  const editResInFlightRef = useRef(false);
  const editResSubmitting = editResForm.formState.isSubmitting;

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

  const openEditRes = useCallback(
    (r: AccommodationReservationRow) => {
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
      },
    [editResForm],
  );


  async function onSaveEditRes(data: AccommodationReservationEditInput) {
    if (!supabase || !canManage || !editingRes) return;
    if (editResInFlightRef.current || editResForm.formState.isSubmitting) {
      return;
    }
    editResInFlightRef.current = true;
    try {
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
    } finally {
      editResInFlightRef.current = false;
    }
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

  const reservationColumns = useMemo(
    () => buildReservationColumns({ t, locale, canManage, onEdit: openEditRes }),
    [t, locale, canManage, openEditRes],
  );

  return (
    <div className="overnatting-page-workspace mx-auto flex w-full flex-col gap-6 pb-24 md:pb-8">
      <AppPageHeader
        className="mb-0 gap-3 md:gap-4"
        surface="default"
        title={t("overnatting.title")}
        actionsClassName="justify-end"
        actions={
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            {canManage ? (
              <Link
                href="/app/overnatting/new"
                className={cn(
                  buttonVariants({ variant: "success", size: "cta" }),
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl shadow-none sm:w-auto",
                )}
              >
                <Plus className="size-5" aria-hidden />
                {t("overnatting.new")}
              </Link>
            ) : null}
            {!loadError ? (
              <Button
                type="button"
                variant="outline"
                size="cta"
                className={cn("w-full gap-2 sm:w-auto", outlineBtnClass)}
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

      {loadError ? (
        <div role="alert">
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
            {t("overnatting.loadError", { error: loadError })}
          </div>
        </div>
      ) : null}

      {!loadError ? (
        <section
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
          aria-label={quickStats.monthLabel}
        >
          <StatCard
            variant="brand"
            className="col-span-2 lg:col-span-1"
            icon={Wallet}
            label={t("overnatting.monthlyRevenue")}
            sublabel={quickStats.monthLabel}
            value={formatCurrency(quickStats.currentMonthRevenue)}
          >
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-app-xs">
              {quickStats.monthOverMonthPct != null ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-bold",
                    trendPositive ? "text-emerald-200" : "text-rose-200",
                  )}
                >
                  {trendPositive ? (
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-4 shrink-0" aria-hidden />
                  )}
                  {t("overnatting.percentFromPrevMonth", {
                    sign: trendPositive ? "+" : "",
                    percent: quickStats.monthOverMonthPct
                      .toFixed(1)
                      .replace(".", locale === "nb" ? "," : "."),
                  })}
                </span>
              ) : (
                <span className="font-medium text-white/75">{t("overnatting.noComparison")}</span>
              )}
              <span className="text-white/70">
                {t("overnatting.prevMonth")}: {formatCurrency(quickStats.prevMonthRevenue)}
              </span>
            </div>
          </StatCard>

          <StatCard
            icon={Percent}
            label={t("overnatting.occupancyRate")}
            value={`${quickStats.occupancyPct}%`}
            caption={<span className="line-clamp-2">{t("overnatting.occupancyDescription")}</span>}
          >
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={quickStats.occupancyPct}
              aria-label={t("overnatting.occupancyRate")}
            >
              <div
                className="h-full rounded-full bg-success transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, quickStats.occupancyPct))}%` }}
              />
            </div>
          </StatCard>

          <StatCard
            icon={Users}
            label={t("overnatting.avgGuests")}
            value={quickStats.avgGuestsActive ?? "—"}
            caption={t("overnatting.perReservation")}
          />

          <StatCard
            className="col-span-2 lg:col-span-1"
            icon={BedDouble}
            label={t("overnatting.units")}
            value={
              <>
                {activeUnitCount}
                <span className="text-app-lg font-semibold text-muted-foreground"> / {sortedUnits.length}</span>
              </>
            }
            caption={`${
              sortedUnits.length === 1 ? t("overnatting.unitSingular") : t("overnatting.unitPlural")
            } ${t("overnatting.unitsAvailableSuffix")}`}
          />
        </section>
      ) : null}

      {!loadError && calendarOpen ? (
        <div className={cn("px-4 py-4 sm:px-6", cardClass)}>
          <div
            className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2"
            role="toolbar"
            aria-label={t("overnatting.availabilityLegend")}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-semibold text-muted-foreground">
                {t("overnatting.availability")}
              </span>
              {loadingRes ? (
                <span className="text-app-xs font-medium text-muted-foreground">
                  {t("overnatting.updating")}
                </span>
              ) : null}
            </div>
            <div className="flex min-w-0 max-sm:basis-full flex-wrap items-center justify-end gap-2 sm:shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-app-xs font-medium text-rn-text-body">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", statusDotClass("success"))}
                  aria-hidden
                />
                {statusLabel("confirmed", t)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-app-xs font-medium text-rn-text-body">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", statusDotClass("warning"))}
                  aria-hidden
                />
                {statusLabel("tentative", t)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-app-xs font-medium text-rn-text-body">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", statusDotClass("danger"))}
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

      {!loadError ? (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
          <section className={cn("min-w-0", cardClass)} aria-labelledby={`${rid}-res-title`}>
            <div className="flex flex-col gap-4 border-b border-foreground/8 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={`${rid}-res-title`}
                  className="font-heading text-app-lg font-bold capitalize text-rn-text-heading md:text-app-xl"
                >
                  {t("overnatting.reservationsMonth", { month: monthLabel })}
                </h2>
                <div className="flex items-center gap-1.5">
                  {monthYm !== ymNow() ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("h-9", outlineBtnClass)}
                      onClick={() => setMonthYm(ymNow())}
                    >
                      {t("calendar.today")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn("size-9", outlineBtnClass)}
                    aria-label={t("calendar.prevMonth")}
                    onClick={() => setMonthYm(ymAdd(monthYm, -1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn("size-9", outlineBtnClass)}
                    aria-label={t("calendar.nextMonth")}
                    onClick={() => setMonthYm(ymAdd(monthYm, 1))}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>

              <section
                className="overnatting-list-filters flex min-w-0 flex-col gap-3"
                aria-label={t("overnatting.filterReservationsAria")}
              >
                <SegmentedFilter
                  ariaLabel={t("overnatting.filterStatusAria")}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { key: "all", label: t("common.actions.all"), count: filterCounts.all },
                    { key: "confirmed", label: statusLabel("confirmed", t), count: filterCounts.confirmed, tone: "success" },
                    { key: "tentative", label: statusLabel("tentative", t), count: filterCounts.tentative, tone: "warning" },
                    { key: "cancelled", label: statusLabel("cancelled", t), count: filterCounts.cancelled, tone: "danger" },
                  ]}
                />

                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
                  <div className="min-w-0">
                    <Label htmlFor={`${rid}-res-unit`} className={filterEyebrowClass}>
                      {t("overnatting.tableUnit")}
                    </Label>
                    <FormSelect
                      id={`${rid}-res-unit`}
                      value={unitFilter}
                      onValueChange={setUnitFilter}
                      aria-label={t("overnatting.filterUnitAria")}
                      className={filterFieldClass}
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
                      className={filterFieldClass}
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
                      className={filterFieldClass}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!hasActiveFilters}
                    className="h-11 gap-2 rounded-xl px-4 font-heading text-app-sm font-semibold sm:col-span-2 sm:h-12 lg:col-span-1"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="size-4 shrink-0" aria-hidden />
                    {t("overnatting.resetFilters")}
                  </Button>
                </div>
              </section>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Calendar className="size-6" aria-hidden />
                </span>
                <p className="max-w-sm text-app-sm text-rn-text-body">
                  {resInMonth.length > 0 && hasActiveFilters
                    ? t("overnatting.emptyFiltered")
                    : t("overnatting.emptyMonth")}
                </p>
                {canManage && !(resInMonth.length > 0 && hasActiveFilters) ? (
                  <Link
                    href="/app/overnatting/new"
                    className={cn(
                      buttonVariants({ variant: "success", size: "cta" }),
                      "inline-flex items-center gap-2 rounded-xl shadow-none",
                    )}
                  >
                    <Plus className="size-4" aria-hidden />
                    {t("overnatting.new")}
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <DataTable
                  rows={filteredReservations}
                  getRowKey={(r) => r.id}
                  columns={reservationColumns}
                  renderMobileItem={(r) => (
                    <div className="flex flex-col gap-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-app-base font-bold text-rn-text-heading">
                            {r.customerName === UNKNOWN_CUSTOMER
                              ? t("overnatting.unknownCustomer")
                              : r.customerName}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-app-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <BedDouble className="size-3.5" aria-hidden />
                              {r.unitName}
                            </span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Users className="size-3.5" aria-hidden />
                              {r.guestCount}
                            </span>
                          </p>
                        </div>
                        <ReservationStatusBadge status={r.status} label={statusLabel(r.status, t)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-app-xs">
                        <div>
                          <p className="font-semibold text-muted-foreground">{t("overnatting.tableArrival")}</p>
                          <p className="mt-0.5 text-app-sm font-medium text-foreground">
                            {formatAppDateFromParts(r.checkInDate, r.checkInTime, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">{t("overnatting.tableDeparture")}</p>
                          <p className="mt-0.5 text-app-sm font-medium text-foreground">
                            {formatAppDateFromParts(r.checkOutDate, r.checkOutTime, locale)}
                          </p>
                        </div>
                      </div>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("w-full", outlineBtnClass)}
                          onClick={() => openEditRes(r)}
                        >
                          {t("common.actions.edit")}
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
              </>
            )}
          </section>

          <aside className={cn("min-w-0 xl:sticky xl:top-20", cardClass)} aria-labelledby={`${rid}-units-title`}>
            <div className="flex items-start justify-between gap-3 border-b border-foreground/8 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2
                  id={`${rid}-units-title`}
                  className="font-heading text-app-lg font-bold text-rn-text-heading"
                >
                  {t("overnatting.units")}
                </h2>
                <p className="mt-0.5 text-app-xs leading-snug text-muted-foreground">
                  {sortedUnits.length}{" "}
                  {sortedUnits.length === 1
                    ? t("overnatting.unitSingular")
                    : t("overnatting.unitPlural")}{" "}
                  {t("overnatting.unitsAvailableSuffix")}
                </p>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("shrink-0 gap-1.5", outlineBtnClass)}
                  onClick={openNewUnit}
                >
                  <Plus className="size-4" aria-hidden />
                  {t("overnatting.newUnit")}
                </Button>
              ) : null}
            </div>

            {sortedUnits.length === 0 ? (
              <p className="px-5 py-8 text-center text-app-sm text-muted-foreground">
                {t("overnatting.calendarEmptyUnits")}
              </p>
            ) : (
              <ul className="divide-y divide-foreground/8" aria-label={t("overnatting.unitsListAria")}>
                {sortedUnits.map((u) => (
                  <li
                    key={u.id}
                    className={cn("flex items-start gap-3 px-4 py-3.5 sm:px-5", !u.active && "opacity-70")}
                  >
                    <span
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-rn-text-heading"
                      aria-hidden
                    >
                      <BedDouble className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate font-heading text-app-base font-bold leading-tight text-rn-text-heading">
                          {u.name}
                        </span>
                        {u.active ? (
                          <span
                            className="size-2 shrink-0 rounded-full bg-success"
                            title={t("statuses.active")}
                            role="img"
                            aria-label={t("statuses.active")}
                          />
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {t("statuses.inactive")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-app-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5 shrink-0" aria-hidden />
                          {t("overnatting.maxGuests", { count: u.maxGuests })}
                        </span>
                        {u.propertyName ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Building2 className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{u.propertyName}</span>
                          </span>
                        ) : null}
                      </p>
                      {u.notes?.trim() ? (
                        <p className="mt-1 line-clamp-1 text-[11px] italic text-muted-foreground">
                          {u.notes.trim()}
                        </p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                          aria-label={`${t("common.actions.edit")}: ${u.name}`}
                          onClick={() => openEditUnit(u)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${t("common.actions.delete")}: ${u.name}`}
                          onClick={() => setDeleteUnitTarget(u)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : null}

      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-foreground/10" showCloseButton>
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
                className="rounded-xl border border-foreground/25 bg-background p-3 shadow-none focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
                rows={2}
                {...unitForm.register("notes")}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-app-sm font-medium">
              <input
                type="checkbox"
                className="size-5 rounded-md border border-foreground/40 accent-[#3d62cf]"
                {...unitForm.register("active")}
              />
              {t("overnatting.activeForBooking")}
            </label>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className={outlineBtnClass}
                onClick={() => setUnitDialogOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" variant="success" className="rounded-xl shadow-none">
                {t("common.actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editResOpen} onOpenChange={setEditResOpen}>
        <DialogContent
          className={cn(
            "max-w-lg gap-0 overflow-hidden rounded-2xl border border-foreground/10 p-0 sm:max-w-xl",
            RN_MODAL_MAX_HEIGHT,
            "flex flex-col",
          )}
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-foreground/10 px-6 pb-4 pt-6 sm:px-8">
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
                <div className="rounded-xl bg-muted/50 px-4 py-3">
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

                <div className="space-y-3 rounded-xl bg-muted/50 p-4 sm:p-5">
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
                            className={fieldClass}
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
                            className={fieldClass}
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
                    className="rounded-xl border border-foreground/25 bg-background p-3 text-app-sm shadow-none focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20 md:text-app-base"
                    {...editResForm.register("notes")}
                  />
                </div>
              </div>

              <DialogFooter
                className={cn(
                  RN_MODAL_FOOTER,
                  "mx-0 mb-0 mt-0 flex flex-col gap-3 rounded-b-[length:var(--app-radius)] border-t border-foreground/10 bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8 sm:py-4",
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
                    className={cn("w-full sm:w-auto", outlineBtnClass)}
                    onClick={() => setEditResOpen(false)}
                  >
                    {t("common.actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="success"
                    className="w-full rounded-xl shadow-none sm:w-auto"
                    disabled={editResSubmitting}
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
