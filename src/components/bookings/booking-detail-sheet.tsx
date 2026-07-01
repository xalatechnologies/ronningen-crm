"use client";

import type {
  BookingListRow,
  BookingStatus,
} from "@/components/bookings/types";
import { RN_MODAL_SCROLL_BODY } from "@/lib/rn-ui";
import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddressField } from "@/components/forms/address-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PriceInput } from "@/components/ui/price-input";
import { Textarea } from "@/components/ui/textarea";
import { TimePickerField } from "@/components/ui/time-picker-field";
import {
  bookingDetailEditSchema,
  NEW_BOOKING_EVENT_TYPES,
  type BookingDetailEditInput,
} from "@/lib/validations";
import {
  BOOKING_PAYMENT_STATUS_VALUES,
  bookingPaymentStatusLabel,
  previewBookingRemainingAfterSave,
  resolveBookingPaymentForPersist,
  resolveStandardBookingPaymentFromAmounts,
} from "@/constants/booking-payment-status";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Save, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-app-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-app-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const labelClass =
  "text-[12px] font-semibold uppercase tracking-wider text-rn-text-slate";

function bookingDetailDefaultsFromRow(
  row: BookingListRow,
): BookingDetailEditInput {
  return {
    customerName: row.customer,
    phone: row.customerPhone ?? "",
    email: row.customerEmail ?? "",
    address: row.customerAddress ?? "",
    bookingReference: row.bookingReference ?? "",
    festType: row.festType?.trim() || "Annet",
    eventType: row.eventTypeForm,
    eventDate: row.eventDateIso,
    eventEndDate: row.eventEndDateIso ?? "",
    eventStartTime: row.eventStartTime ?? "",
    eventEndTime: row.eventEndTime ?? "",
    guestCount: row.guests,
    totalNok: row.totalNok,
    paidNok: row.paidNok,
    paymentStatus: row.paymentStatus,
    paymentDueDate: row.paymentDueDateIso ?? "",
    notes: row.notes ?? "",
  };
}

export type BookingDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: BookingListRow | null;
  updatingId: string | null;
  onSetStatus: (
    id: string,
    next: BookingStatus,
    opts?: { confirmMessage?: string },
  ) => void;
  /** Owner/admin — permanent delete matches RLS. */
  canDeleteBooking?: boolean;
};

export function BookingDetailSheet({
  open,
  onOpenChange,
  row,
  updatingId,
  onSetStatus,
  canDeleteBooking = false,
}: BookingDetailSheetProps) {
  const { t, formatCurrency, formatDate } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateBookings } = useTenantDataInvalidation();
  const [detailSaving, setDetailSaving] = useState(false);
  const [inkassoBusy, setInkassoBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const form = useForm<BookingDetailEditInput>({
    resolver: zodResolver(
      bookingDetailEditSchema,
    ) as Resolver<BookingDetailEditInput>,
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      address: "",
      bookingReference: "",
      festType: "",
      eventType: "Privat",
      eventDate: "",
      eventEndDate: "",
      eventStartTime: "",
      eventEndTime: "",
      guestCount: 1,
      totalNok: 0,
      paidNok: 0,
      paymentStatus: "unpaid",
      paymentDueDate: "",
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const totalW = useWatch({ control, name: "totalNok" });
  const paidW = useWatch({ control, name: "paidNok" });
  const paymentStatusW = useWatch({ control, name: "paymentStatus" });
  const remainingPreview = useMemo(() => {
    const total = Number(totalW);
    const paid = Number(paidW);
    if (!Number.isFinite(total) || !Number.isFinite(paid)) return null;
    return previewBookingRemainingAfterSave({
      totalNok: total,
      paidNok: paid,
      paymentStatus: paymentStatusW ?? "unpaid",
    });
  }, [totalW, paidW, paymentStatusW]);

  const paymentStatusOptions = useMemo(
    () =>
      BOOKING_PAYMENT_STATUS_VALUES.map((v) => ({
        value: v,
        label: bookingPaymentStatusLabel(v, t),
      })),
    [t],
  );

  useLayoutEffect(() => {
    if (!row || !open) return;
    reset(bookingDetailDefaultsFromRow(row));
  }, [row, open, reset]);

  // Sync standard status when beløp endres — ikke når bruker velger status manuelt.
  useEffect(() => {
    if (!row || !open) return;
    const ps = getValues("paymentStatus");
    if (ps === "waived" || ps === "disputed" || ps === "other") return;
    const t = Number(totalW);
    const p = Number(paidW);
    if (!Number.isFinite(t) || !Number.isFinite(p)) return;
    const next = resolveStandardBookingPaymentFromAmounts(t, p).paymentStatus;
    if (next !== ps) {
      setValue("paymentStatus", next, { shouldValidate: true });
    }
  }, [row, open, totalW, paidW, setValue, getValues]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset dialog when sheet closes
    if (!open) setDeleteDialogOpen(false);
  }, [open]);

  if (!row) return null;

  const bookingRow = row;

  const busy =
    updatingId === bookingRow.id ||
    detailSaving ||
    inkassoBusy ||
    deleteBusy;

  async function onSave(data: BookingDetailEditInput) {
    if (!currentOrganizationId) return;
    setDetailSaving(true);
    try {
      const { error: custErr } = await supabase
        .from("customers")
        .update({
          name: data.customerName,
          phone: data.phone,
          email: data.email.trim() ? data.email.trim() : null,
          address: data.address.trim() ? data.address.trim() : null,
        })
        .eq("id", bookingRow.customerId)
        .eq("organization_id", currentOrganizationId);

      if (custErr) {
        toast.error(t("bookings.detail.updateCustomerFailed"), {
          description: custErr.message,
        });
        return;
      }

      const { paid, remaining, paymentStatus: finalPaymentStatus } =
        resolveBookingPaymentForPersist({
          totalNok: data.totalNok,
          paidNok: data.paidNok,
          paymentStatus: data.paymentStatus,
        });

      const { error: bookErr } = await supabase
        .from("bookings")
        .update({
          booking_reference: data.bookingReference.trim() || null,
          fest_type: data.festType,
          event_type: data.eventType,
          event_date: data.eventDate,
          event_end_date: data.eventEndDate.trim() || null,
          event_start_time: data.eventStartTime.trim() || null,
          event_end_time: data.eventEndTime.trim() || null,
          guest_count: data.guestCount,
          total_price: data.totalNok,
          paid_amount: paid,
          remaining_amount: remaining,
          payment_due_date: data.paymentDueDate ? data.paymentDueDate : null,
          payment_status: finalPaymentStatus,
          notes: data.notes?.trim() ? data.notes.trim() : null,
        })
        .eq("id", bookingRow.id)
        .eq("organization_id", currentOrganizationId);

      if (bookErr) {
        toast.error(t("bookings.detail.updateFailed"), {
          description: bookErr.message,
        });
        return;
      }

      toast.success(t("bookings.detail.changesSaved"));
      onOpenChange(false);
      invalidateBookings();
    } finally {
      setDetailSaving(false);
    }
  }

  async function registerCollectionNotice() {
    if (!currentOrganizationId) return;
    setInkassoBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ collection_notice_sent_at: new Date().toISOString() })
        .eq("id", bookingRow.id)
        .eq("organization_id", currentOrganizationId);
      if (error) {
        toast.error(t("bookings.detail.registerCollectionFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("bookings.detail.collectionRegisteredToast"));
      invalidateBookings();
    } finally {
      setInkassoBusy(false);
    }
  }

  async function clearCollectionNotice() {
    if (!currentOrganizationId) return;
    setInkassoBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ collection_notice_sent_at: null })
        .eq("id", bookingRow.id)
        .eq("organization_id", currentOrganizationId);
      if (error) {
        toast.error(t("bookings.detail.removeMarkingFailed"), {
          description: error.message,
        });
        return;
      }
      toast.success(t("bookings.detail.markingRemoved"));
      invalidateBookings();
    } finally {
      setInkassoBusy(false);
    }
  }

  async function performDeleteBooking() {
    if (!currentOrganizationId) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingRow.id)
        .eq("organization_id", currentOrganizationId);

      if (error) {
        toast.error(t("bookings.detail.deleteFailed"), {
          description: error.message,
        });
        return;
      }

      toast.success(t("bookings.detail.deleted"));
      setDeleteDialogOpen(false);
      onOpenChange(false);
      invalidateBookings();
    } finally {
      setDeleteBusy(false);
    }
  }

  function formatInkassoRegistered(iso: string) {
    return formatDate(new Date(iso), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-dvh min-h-0 w-full max-w-[min(100vw,72rem)] flex-col gap-0 overflow-hidden border-l-2 border-rn-border-strong bg-card p-0 sm:max-w-6xl",
          "shadow-rn-card",
        )}
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-4 border-b-2 border-rn-border-strong bg-rn-surface-table-head px-6 py-5 sm:px-8 sm:py-6">
          <SheetTitle className="app-section-title min-w-0 flex-1 text-left tracking-tight">
            {t("bookings.detail.title")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("bookings.detail.description", { customer: bookingRow.customer })}
          </SheetDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-md border-2 border-transparent hover:border-rn-border-strong/60"
            aria-label={t("common.actions.close")}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit(onSave)}
        >
          <div className={cn(RN_MODAL_SCROLL_BODY, "flex flex-col gap-6 p-6 sm:p-8")}>
            <div aria-label={t("common.fields.status")}>
              <BookingStatusBadge status={bookingRow.status} />
            </div>

            <section aria-labelledby="booking-edit-ref">
              <h3 id="booking-edit-ref" className={cn(labelClass, "mb-2")}>
                {t("common.fields.reference")}
              </h3>
              <Input
                {...register("bookingReference")}
                className={fieldClass}
                aria-invalid={!!errors.bookingReference}
                placeholder={t("bookings.detail.referencePlaceholder")}
              />
              {errors.bookingReference ? (
                <p className="mt-1 text-app-xs text-destructive">
                  {errors.bookingReference.message}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="booking-edit-customer">
              <h3 id="booking-edit-customer" className={cn(labelClass, "mb-3")}>
                {t("bookings.detail.customer")}
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bde-name" className={labelClass}>
                    {t("common.fields.name")}
                  </Label>
                  <Input
                    id="bde-name"
                    {...register("customerName")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.customerName}
                  />
                  {errors.customerName ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.customerName.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-phone" className={labelClass}>
                    {t("common.fields.phone")}
                  </Label>
                  <Input
                    id="bde-phone"
                    {...register("phone")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.phone}
                    inputMode="tel"
                  />
                  {errors.phone ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-email" className={labelClass}>
                    {t("common.fields.email")}
                  </Label>
                  <Input
                    id="bde-email"
                    type="email"
                    {...register("email")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-address" className={labelClass}>
                    {t("common.fields.address")}
                  </Label>
                  <AddressField
                    id="bde-address"
                    name="address"
                    register={register}
                    setValue={setValue}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.address}
                  />
                  {errors.address ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.address.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section aria-labelledby="booking-edit-event">
              <h3 id="booking-edit-event" className={cn(labelClass, "mb-3")}>
                {t("bookings.detail.event")}
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bde-fest" className={labelClass}>
                    {t("common.fields.type")}
                  </Label>
                  <Input
                    id="bde-fest"
                    {...register("festType")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.festType}
                  />
                  {errors.festType ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.festType.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-event-type" className={labelClass}>
                    {t("common.category")}
                  </Label>
                  <FormSelectField
                    name="eventType"
                    control={control}
                    id="bde-event-type"
                    className="mt-1.5"
                    aria-invalid={!!errors.eventType}
                    options={toStringOptions(NEW_BOOKING_EVENT_TYPES)}
                  />
                  {errors.eventType ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.eventType.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-app-xs leading-relaxed text-muted-foreground">
                    {t("bookings.detail.dateRangeHint")}
                  </p>
                </div>
                <div>
                  <Label htmlFor="bde-date" className={labelClass}>
                    {t("bookings.dateFrom")}
                  </Label>
                  <Controller
                    name="eventDate"
                    control={control}
                    render={({ field }) => (
                      <DatePickerField
                        id="bde-date"
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          void field.onBlur();
                        }}
                        variant="toolbar"
                        className={cn(
                          fieldClass,
                          "mt-1.5 bg-background shadow-sm",
                        )}
                        aria-invalid={!!errors.eventDate}
                      />
                    )}
                  />
                  {errors.eventDate ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.eventDate.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-end-date" className={labelClass}>
                    {t("bookings.detail.toDateOptional")}{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      ({t("common.optional")})
                    </span>
                  </Label>
                  <Controller
                    name="eventEndDate"
                    control={control}
                    render={({ field }) => (
                      <DatePickerField
                        id="bde-end-date"
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          void field.onBlur();
                        }}
                        variant="toolbar"
                        className={cn(
                          fieldClass,
                          "mt-1.5 bg-background shadow-sm",
                          errors.eventEndDate && "border-destructive",
                        )}
                        aria-invalid={!!errors.eventEndDate}
                      />
                    )}
                  />
                  {errors.eventEndDate ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.eventEndDate.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-start-time" className={labelClass}>
                    {t("common.fromTime")}{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      ({t("common.optional")})
                    </span>
                  </Label>
                  <TimePickerField
                    id="bde-start-time"
                    {...register("eventStartTime")}
                    className={cn(
                      fieldClass,
                      "mt-1.5",
                      errors.eventStartTime && "border-destructive",
                    )}
                    aria-invalid={!!errors.eventStartTime}
                  />
                  {errors.eventStartTime ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.eventStartTime.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-end-time" className={labelClass}>
                    {t("common.toTime")}{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      ({t("common.optional")})
                    </span>
                  </Label>
                  <TimePickerField
                    id="bde-end-time"
                    {...register("eventEndTime")}
                    className={cn(
                      fieldClass,
                      "mt-1.5",
                      errors.eventEndTime && "border-destructive",
                    )}
                    aria-invalid={!!errors.eventEndTime}
                  />
                  {errors.eventEndTime ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.eventEndTime.message}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bde-guests" className={labelClass}>
                    {t("common.guests")}
                  </Label>
                  <Input
                    id="bde-guests"
                    type="number"
                    min={1}
                    {...register("guestCount")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.guestCount}
                  />
                  {errors.guestCount ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.guestCount.message}
                    </p>
                  ) : null}
                </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="booking-edit-money">
              <h3 id="booking-edit-money" className={cn(labelClass, "mb-3")}>
                {t("bookings.detail.finance")}
              </h3>
              <div className="mb-5">
                <Label htmlFor="bde-pay-status" className={labelClass}>
                  {t("bookings.detail.paymentStatus")}
                </Label>
                <FormSelectField
                  name="paymentStatus"
                  control={control}
                  id="bde-pay-status"
                  className="mt-1.5"
                  aria-invalid={!!errors.paymentStatus}
                  options={paymentStatusOptions}
                />
                {errors.paymentStatus ? (
                  <p className="mt-1 text-app-xs text-destructive">
                    {errors.paymentStatus.message}
                  </p>
                ) : null}
                <p className="mt-2 text-app-xs leading-relaxed text-muted-foreground">
                  {t("bookings.detail.paymentStatusHint", {
                    paid: t("bookings.paymentStatus.paid"),
                    unpaid: t("bookings.paymentStatus.unpaid"),
                    waived: t("bookings.paymentStatus.waived"),
                  })}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="bde-total" className={labelClass}>
                    {t("bookings.detail.agreedTotal")}
                  </Label>
                  <PriceInput
                    id="bde-total"
                    step={1}
                    {...register("totalNok")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.totalNok}
                  />
                  {errors.totalNok ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.totalNok.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-paid" className={labelClass}>
                    {t("bookings.detail.paidAmount")}
                  </Label>
                  <PriceInput
                    id="bde-paid"
                    step={1}
                    {...register("paidNok")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.paidNok}
                  />
                  {errors.paidNok ? (
                    <p className="mt-1 text-app-xs text-destructive">
                      {errors.paidNok.message}
                    </p>
                  ) : null}
                </div>
              </div>
              {remainingPreview != null ? (
                <p className="mt-2 text-app-sm font-medium text-rn-text-body">
                  {t("bookings.detail.remainingAfterSave", {
                    amount: formatCurrency(remainingPreview),
                  })}
                </p>
              ) : null}
              <div className="mt-5">
                <Label htmlFor="bde-due" className={labelClass}>
                  {t("bookings.detail.invoiceDueOptional")}
                </Label>
                <Controller
                  name="paymentDueDate"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <DatePickerField
                        id="bde-due"
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          void field.onBlur();
                        }}
                        variant="toolbar"
                        className={cn(
                          fieldClass,
                          "mt-1.5 bg-background shadow-sm",
                        )}
                        aria-invalid={!!errors.paymentDueDate}
                      />
                      {field.value ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="mt-2 h-9 px-2 text-app-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            field.onChange("");
                            void field.onBlur();
                          }}
                        >
                          {t("bookings.detail.clearDueDate")}
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
                {errors.paymentDueDate ? (
                  <p className="mt-1 text-app-xs text-destructive">
                    {errors.paymentDueDate.message}
                  </p>
                ) : null}
                <p className="mt-2 text-app-xs leading-relaxed text-muted-foreground">
                  {t("bookings.detail.invoiceDueHint", {
                    invoices: t("navigation.invoices"),
                  })}
                </p>
              </div>
            </section>

            <section
              aria-labelledby="booking-inkasso"
              className="rounded-md border-2 border-violet-200/80 bg-violet-50/40 p-4 sm:p-5"
            >
              <h3 id="booking-inkasso" className={cn(labelClass, "mb-2")}>
                {t("bookings.detail.collection")}
              </h3>
              <p className="text-app-sm leading-relaxed text-muted-foreground">
                {t("bookings.detail.collectionDesc")}
              </p>
              {bookingRow.collectionNoticeSentAt ? (
                <div className="mt-4 space-y-3">
                  <p className="rounded-md border border-violet-200 bg-card px-4 py-3 text-app-sm font-medium text-violet-950 dark:border-violet-800 dark:text-violet-200">
                    {t("bookings.detail.collectionRegistered", {
                      date: formatInkassoRegistered(
                        bookingRow.collectionNoticeSentAt,
                      ),
                    })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    className="h-11 w-full rounded-md border-2 border-violet-300 font-semibold text-violet-950 hover:bg-violet-100/80"
                    onClick={() => void clearCollectionNotice()}
                  >
                    {t("bookings.detail.removeMarking")}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  className="mt-4 h-11 w-full rounded-md border-2 border-violet-400 bg-violet-700 font-semibold text-white hover:bg-violet-800"
                  onClick={() => void registerCollectionNotice()}
                >
                  {t("bookings.detail.registerCollection")}
                </Button>
              )}
            </section>

            <section aria-labelledby="booking-edit-notes">
              <h3 id="booking-edit-notes" className={cn(labelClass, "mb-2")}>
                {t("bookings.detail.notesTitle")}
              </h3>
              <p
                id="booking-edit-notes-hint"
                className="mb-3 text-app-sm leading-relaxed text-muted-foreground"
              >
                {t("bookings.detail.notesHint")}
              </p>
              <Textarea
                {...register("notes")}
                rows={6}
                className={cn(
                  fieldClass,
                  "min-h-32 py-3 text-app-sm md:text-app-base",
                )}
                aria-invalid={!!errors.notes}
                aria-describedby="booking-edit-notes-hint"
                placeholder={t("bookings.detail.notesPlaceholder")}
              />
              {errors.notes ? (
                <p className="mt-1 text-app-xs text-destructive">
                  {errors.notes.message}
                </p>
              ) : null}
            </section>
          </div>

          <SheetFooter className="mt-0 max-h-none flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer/50 p-6 sm:max-h-none sm:flex-row sm:flex-wrap sm:justify-stretch">
            <Button
              type="submit"
              variant="success"
              size="cta"
              disabled={busy}
              className="w-full sm:order-first sm:flex-1"
            >
              <Save className="mr-2 size-4 shrink-0" aria-hidden />
              {t("bookings.detail.saveChanges")}
            </Button>
            {bookingRow.status === "pending" ? (
              <Button
                type="button"
                variant="success"
                size="cta"
                disabled={busy}
                className="w-full sm:flex-1"
                onClick={() => onSetStatus(bookingRow.id, "confirmed")}
              >
                <CheckCircle2 className="mr-2 size-4 shrink-0" aria-hidden />
                {t("bookings.detail.confirmBooking")}
              </Button>
            ) : null}
            {bookingRow.status === "pending" ||
            bookingRow.status === "confirmed" ? (
              <Button
                type="button"
                variant="outline"
                size="cta"
                disabled={busy}
                className="w-full border-2 border-destructive/40 font-heading font-bold text-destructive hover:bg-destructive/10 sm:flex-1"
                onClick={() =>
                  onSetStatus(bookingRow.id, "cancelled", {
                    confirmMessage: t("bookings.cancelConfirm"),
                  })
                }
              >
                <XCircle className="mr-2 size-4 shrink-0" aria-hidden />
                {t("bookings.detail.cancelBooking")}
              </Button>
            ) : null}
            {bookingRow.status === "cancelled" ? (
              <Button
                type="button"
                variant="outline"
                size="cta"
                disabled={busy}
                className="w-full border-2 border-rn-border-strong font-heading font-bold sm:flex-1"
                onClick={() =>
                  onSetStatus(bookingRow.id, "pending", {
                    confirmMessage: t("bookings.detail.moveToPendingConfirm"),
                  })
                }
              >
                {t("bookings.detail.moveToPending")}
              </Button>
            ) : null}
            {canDeleteBooking ? (
              <Button
                type="button"
                variant="outline"
                size="cta"
                disabled={busy}
                className="w-full border-2 border-destructive/40 font-heading font-bold text-destructive hover:bg-destructive/10 sm:w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 size-4 shrink-0" aria-hidden />
                {t("bookings.detail.deleteBooking")}
              </Button>
            ) : null}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!deleteBusy) setDeleteDialogOpen(nextOpen);
        }}
      >
        <DialogContent
          showCloseButton
          className="z-[100] max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-xl sm:max-w-md"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="app-section-title">
              {t("bookings.detail.deleteTitle")}
            </DialogTitle>
            <DialogDescription className="text-app-base leading-relaxed text-muted-foreground">
              {t("bookings.detail.deleteDescription", {
                customer: bookingRow.customer,
                date: bookingRow.date,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="cta"
              className="w-full border-2 border-rn-border-strong sm:w-auto"
              disabled={deleteBusy}
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              type="button"
              size="cta"
              disabled={deleteBusy}
              className="w-full border-2 border-red-200 bg-red-600 !text-white hover:bg-red-700 sm:w-auto"
              onClick={() => void performDeleteBooking()}
            >
              {deleteBusy
                ? t("common.deleting")
                : t("bookings.detail.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
