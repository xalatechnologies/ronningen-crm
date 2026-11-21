"use client";

import { outlineBtnClass } from "@/features/overnatting/components/form-classes";
import { useTranslation } from "@/i18n/client";
import dynamic from "next/dynamic";
import { AccommodationMonthCalendar } from "@/features/overnatting/components/accommodation-month-calendar";
import { UNKNOWN_CUSTOMER, type AccommodationReservationRow, type AccommodationUnitRow } from "@/features/overnatting/types";
import { statusLabel } from "@/lib/navigation/nav-labels";
import { usePageSearch } from "@/providers/page-search-provider";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Label } from "@/components/ui/label";
import { FormSelect, toIdNameOptions } from "@/components/ui/form-select";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { DataTable } from "@/components/ui/data-table";
import { createUnit, deleteReservation, deleteUnit, fetchReservationsInWindow, toReservationUpdatePayload, toUnitPayload, updateReservation, updateUnit } from "@/features/overnatting/data/overnatting";
import { countReservationsByStatus, filterReservations, mapReservations, reservationFetchWindow, reservationsInMonth, ymNow, type AccommodationStatusFilter } from "@/features/overnatting/lib/reservation-rules";
import { ReservationStatusBadge, buildReservationColumns } from "@/features/overnatting/components/reservation-columns";
import { StatCard } from "@/components/ui/stat-card";
import { statusDotClass } from "@/components/ui/status-badge";
import { accommodationReservationEditSchema, accommodationUnitFormSchema, type AccommodationReservationEditInput, type AccommodationUnitFormInput } from "@/lib/validations";
import { accommodationTimeToInputValue } from "@/lib/accommodation-time";
import { formatAppDateFromParts } from "@/lib/format-datetime";
import { monthFirstDayYm, ymAdd } from "@/lib/overnatting-month";
import { computeAccommodationQuickStats } from "@/features/overnatting/lib/quick-stats";
import { cn } from "@/lib/utils";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { nb } from "date-fns/locale/nb";
import { ArrowDownRight, ArrowUpRight, BedDouble, Building2, Calendar, ChevronLeft, ChevronRight, Pencil, Percent, Plus, RotateCcw, Trash2, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

const filterEyebrowClass = "mb-1.5 block text-[13px] font-semibold text-foreground";

const cardClass = "overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/8";

const filterFieldClass =
  "h-11 min-h-11 w-full rounded-xl border border-foreground/25 text-app-sm shadow-none sm:h-12 sm:min-h-12 sm:text-app-base";




const UnitDialog = dynamic(() =>
  import("@/features/overnatting/components/unit-dialog").then((m) => m.UnitDialog),
);
const ReservationEditDialog = dynamic(() =>
  import("@/features/overnatting/components/reservation-edit-dialog").then((m) => m.ReservationEditDialog),
);

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

  const fetchReservations = useCallback(async () => {
    if (!supabase) return;
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch {
      return;
    }
    const window = reservationFetchWindow(monthYm);
    if (!window) return;
    setLoadingRes(true);
    const { data, error } = await fetchReservationsInWindow(supabase, orgId, window);
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
    const payload = toUnitPayload(data);
    if (editingUnit) {
      const { error } = await updateUnit(supabase, editingUnit.id, payload);
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

      const { error } = await createUnit(supabase, orgId, payload);
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
      const { error } = await deleteUnit(supabase, deleteUnitTarget.id);
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
      const { error } = await updateReservation(supabase, editingRes.id, toReservationUpdatePayload(data));
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
      const { error } = await deleteReservation(supabase, editingRes.id);
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

  const resInMonth = useMemo(() => reservationsInMonth(reservations, monthYm), [reservations, monthYm]);
  const filterCounts = useMemo(() => countReservationsByStatus(resInMonth), [resInMonth]);

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    unitFilter !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const filteredReservations = useMemo(
    () => filterReservations(resInMonth, { query, statusFilter, unitFilter, dateFrom, dateTo }),
    [resInMonth, query, statusFilter, unitFilter, dateFrom, dateTo],
  );

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

      <UnitDialog
        open={unitDialogOpen}
        onOpenChange={setUnitDialogOpen}
        isEditing={editingUnit != null}
        form={unitForm}
        onSubmit={onSaveUnit}
        properties={properties}
        rid={rid}
      />

      <ReservationEditDialog
        open={editResOpen}
        onOpenChange={setEditResOpen}
        reservation={editingRes}
        form={editResForm}
        onSubmit={onSaveEditRes}
        onDeleteClick={() => setDeleteResConfirmOpen(true)}
        units={sortedUnits}
        rid={rid}
      />

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
