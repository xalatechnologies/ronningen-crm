"use client";

import type {
  BookingListRow,
  BookingStatus,
} from "@/components/bookings/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  bookingDetailEditSchema,
  NEW_BOOKING_EVENT_TYPES,
  type BookingDetailEditInput,
} from "@/lib/validations";
import {
  BOOKING_PAYMENT_STATUS_LABELS,
  BOOKING_PAYMENT_STATUS_VALUES,
  resolveBookingPaymentForPersist,
  resolveStandardBookingPaymentFromAmounts,
} from "@/constants/booking-payment-status";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Save, Trash2, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const selectChevronPad = "pr-10 md:pr-11 appearance-none bg-transparent";

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

function formatNok(n: number) {
  return `${new Intl.NumberFormat("nb-NO").format(Math.round(n))} NOK`;
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
  const supabase = useSupabase();
  const router = useRouter();
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
    formState: { errors },
  } = form;

  const totalW = useWatch({ control, name: "totalNok" });
  const paidW = useWatch({ control, name: "paidNok" });
  const paymentStatusW = useWatch({ control, name: "paymentStatus" });
  const remainingPreview = useMemo(() => {
    const t = Number(totalW);
    const p = Number(paidW);
    if (!Number.isFinite(t) || !Number.isFinite(p)) return null;
    return Math.max(0, t - Math.min(p, t));
  }, [totalW, paidW]);

  useLayoutEffect(() => {
    if (!row || !open) return;
    reset(bookingDetailDefaultsFromRow(row));
  }, [row, open, reset]);

  useEffect(() => {
    if (!row || !open) return;
    const ps = paymentStatusW;
    if (ps === "waived" || ps === "disputed" || ps === "other") return;
    const t = Number(totalW);
    const p = Number(paidW);
    if (!Number.isFinite(t) || !Number.isFinite(p)) return;
    const next = resolveStandardBookingPaymentFromAmounts(t, p).paymentStatus;
    if (next !== ps) {
      setValue("paymentStatus", next, { shouldValidate: true });
    }
  }, [row, open, totalW, paidW, paymentStatusW, setValue]);

  useEffect(() => {
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
        .eq("id", bookingRow.customerId);

      if (custErr) {
        toast.error("Kunne ikke oppdatere kunde", {
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
        .eq("id", bookingRow.id);

      if (bookErr) {
        toast.error("Kunne ikke oppdatere booking", {
          description: bookErr.message,
        });
        return;
      }

      toast.success("Endringer lagret");
      await router.refresh();
    } finally {
      setDetailSaving(false);
    }
  }

  async function registerCollectionNotice() {
    setInkassoBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ collection_notice_sent_at: new Date().toISOString() })
        .eq("id", bookingRow.id);
      if (error) {
        toast.error("Kunne ikke registrere innkassovarsel", {
          description: error.message,
        });
        return;
      }
      toast.success("Innkassovarsel registrert");
      await router.refresh();
    } finally {
      setInkassoBusy(false);
    }
  }

  async function clearCollectionNotice() {
    setInkassoBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ collection_notice_sent_at: null })
        .eq("id", bookingRow.id);
      if (error) {
        toast.error("Kunne ikke fjerne markering", {
          description: error.message,
        });
        return;
      }
      toast.success("Markering fjernet");
      await router.refresh();
    } finally {
      setInkassoBusy(false);
    }
  }

  async function performDeleteBooking() {
    setDeleteBusy(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingRow.id);

      if (error) {
        toast.error("Kunne ikke slette booking", {
          description: error.message,
        });
        return;
      }

      toast.success("Booking slettet");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      await router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  function formatInkassoRegistered(iso: string) {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "flex h-full w-full max-w-[min(100vw,72rem)] flex-col gap-0 border-l-2 border-rn-border-strong bg-card p-0 sm:max-w-6xl",
          "shadow-rn-card",
        )}
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-4 border-b-2 border-rn-border-strong bg-rn-surface-table-head px-6 py-5 sm:px-8 sm:py-6">
          <SheetTitle className="font-heading min-w-0 flex-1 text-left text-xl font-bold tracking-tight text-rn-text-heading">
            Rediger booking
          </SheetTitle>
          <SheetDescription className="sr-only">
            Kunde: {bookingRow.customer}. Rediger bookingdetaljer og kunde for
            denne bestillingen.
          </SheetDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-md border-2 border-transparent hover:border-rn-border-strong/60"
            aria-label="Lukk"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </SheetHeader>

        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit(onSave)}
        >
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 sm:p-8">
            <div aria-label="Bookingstatus">
              <BookingStatusBadge status={bookingRow.status} />
            </div>

            <section aria-labelledby="booking-edit-ref">
              <h3 id="booking-edit-ref" className={cn(labelClass, "mb-2")}>
                Referanse
              </h3>
              <Input
                {...register("bookingReference")}
                className={fieldClass}
                aria-invalid={!!errors.bookingReference}
                placeholder="Egen ID / saksnummer"
              />
              {errors.bookingReference ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.bookingReference.message}
                </p>
              ) : null}
            </section>

            <section aria-labelledby="booking-edit-customer">
              <h3 id="booking-edit-customer" className={cn(labelClass, "mb-3")}>
                Kunde
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bde-name" className={labelClass}>
                    Navn
                  </Label>
                  <Input
                    id="bde-name"
                    {...register("customerName")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.customerName}
                  />
                  {errors.customerName ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.customerName.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-phone" className={labelClass}>
                    Telefon
                  </Label>
                  <Input
                    id="bde-phone"
                    {...register("phone")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.phone}
                    inputMode="tel"
                  />
                  {errors.phone ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-email" className={labelClass}>
                    E-post
                  </Label>
                  <Input
                    id="bde-email"
                    type="email"
                    {...register("email")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-address" className={labelClass}>
                    Adresse
                  </Label>
                  <Input
                    id="bde-address"
                    {...register("address")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.address}
                  />
                  {errors.address ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.address.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section aria-labelledby="booking-edit-event">
              <h3 id="booking-edit-event" className={cn(labelClass, "mb-3")}>
                Arrangement
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bde-fest" className={labelClass}>
                    Type fest
                  </Label>
                  <Input
                    id="bde-fest"
                    {...register("festType")}
                    className={cn(fieldClass, "mt-1.5")}
                    aria-invalid={!!errors.festType}
                  />
                  {errors.festType ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.festType.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-event-type" className={labelClass}>
                    Kategori
                  </Label>
                  <select
                    id="bde-event-type"
                    {...register("eventType")}
                    className={cn(fieldClass, selectChevronPad, "mt-1.5")}
                  >
                    {NEW_BOOKING_EVENT_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {errors.eventType ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.eventType.message}
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    La «Til dato» stå tom for ett døgn. Tid er valgfritt (24t).
                  </p>
                </div>
                <div>
                  <Label htmlFor="bde-date" className={labelClass}>
                    Fra dato
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
                    <p className="mt-1 text-xs text-destructive">
                      {errors.eventDate.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-end-date" className={labelClass}>
                    Til dato{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      (valgfri)
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
                    <p className="mt-1 text-xs text-destructive">
                      {errors.eventEndDate.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-start-time" className={labelClass}>
                    Fra kl.{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      (valgfri)
                    </span>
                  </Label>
                  <Input
                    id="bde-start-time"
                    type="time"
                    step={60}
                    {...register("eventStartTime")}
                    className={cn(
                      fieldClass,
                      "mt-1.5",
                      errors.eventStartTime && "border-destructive",
                    )}
                    aria-invalid={!!errors.eventStartTime}
                  />
                  {errors.eventStartTime ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.eventStartTime.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-end-time" className={labelClass}>
                    Til kl.{" "}
                    <span className="font-normal normal-case text-muted-foreground">
                      (valgfri)
                    </span>
                  </Label>
                  <Input
                    id="bde-end-time"
                    type="time"
                    step={60}
                    {...register("eventEndTime")}
                    className={cn(
                      fieldClass,
                      "mt-1.5",
                      errors.eventEndTime && "border-destructive",
                    )}
                    aria-invalid={!!errors.eventEndTime}
                  />
                  {errors.eventEndTime ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.eventEndTime.message}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bde-guests" className={labelClass}>
                    Antall gjester
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
                    <p className="mt-1 text-xs text-destructive">
                      {errors.guestCount.message}
                    </p>
                  ) : null}
                </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="booking-edit-money">
              <h3 id="booking-edit-money" className={cn(labelClass, "mb-3")}>
                Økonomi (NOK)
              </h3>
              <div className="mb-5">
                <Label htmlFor="bde-pay-status" className={labelClass}>
                  Betalingsstatus
                </Label>
                <select
                  id="bde-pay-status"
                  {...register("paymentStatus")}
                  className={cn(fieldClass, selectChevronPad, "mt-1.5")}
                >
                  {BOOKING_PAYMENT_STATUS_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {BOOKING_PAYMENT_STATUS_LABELS[v]}
                    </option>
                  ))}
                </select>
                {errors.paymentStatus ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.paymentStatus.message}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  <strong className="font-medium text-foreground">Fullt betalt</strong> og{" "}
                  <strong className="font-medium text-foreground">Ikke betalt</strong>{" "}
                  oppdaterer innbetaling og rest automatisk ved lagring.{" "}
                  <strong className="font-medium text-foreground">Ettergitt</strong> setter
                  rest til 0 (beholder registrert innbetalt).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="bde-total" className={labelClass}>
                    Avtalt total
                  </Label>
                  <Input
                    id="bde-total"
                    type="number"
                    min={0}
                    step={1}
                    {...register("totalNok")}
                    className={cn(fieldClass, "mt-1.5 tabular-nums")}
                    aria-invalid={!!errors.totalNok}
                  />
                  {errors.totalNok ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.totalNok.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="bde-paid" className={labelClass}>
                    Innbetalt
                  </Label>
                  <Input
                    id="bde-paid"
                    type="number"
                    min={0}
                    step={1}
                    {...register("paidNok")}
                    className={cn(fieldClass, "mt-1.5 tabular-nums")}
                    aria-invalid={!!errors.paidNok}
                  />
                  {errors.paidNok ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.paidNok.message}
                    </p>
                  ) : null}
                </div>
              </div>
              {remainingPreview != null ? (
                <p className="mt-2 text-sm font-medium text-rn-text-body">
                  Restbeløp etter lagring:{" "}
                  <span className="tabular-nums text-rn-text-heading">
                    {formatNok(remainingPreview)}
                  </span>
                </p>
              ) : null}
              <div className="mt-5">
                <Label htmlFor="bde-due" className={labelClass}>
                  Fakturaforfall (valgfritt)
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
                          className="mt-2 h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            field.onChange("");
                            void field.onBlur();
                          }}
                        >
                          Tøm forfallsdato
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
                {errors.paymentDueDate ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.paymentDueDate.message}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  La feltet stå tomt dersom du vil at{" "}
                  <strong className="font-medium text-foreground">Fakturaer</strong>{" "}
                  skal bruke arrangementsdato som forfallsreferanse.
                </p>
              </div>
            </section>

            <section
              aria-labelledby="booking-inkasso"
              className="rounded-md border-2 border-violet-200/80 bg-violet-50/40 p-4 sm:p-5"
            >
              <h3 id="booking-inkasso" className={cn(labelClass, "mb-2")}>
                Oppfølging og inkasso
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Registrer når innkassovarsel er sendt, slik at fakturalisten og
                teamet ser det tydelig. Dette erstatter ikke juridisk dokumentasjon.
              </p>
              {bookingRow.collectionNoticeSentAt ? (
                <div className="mt-4 space-y-3">
                  <p className="rounded-md border border-violet-200 bg-white px-4 py-3 text-sm font-medium text-violet-950">
                    Innkassovarsel registrert{" "}
                    {formatInkassoRegistered(bookingRow.collectionNoticeSentAt)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    className="h-11 w-full rounded-md border-2 border-violet-300 font-semibold text-violet-950 hover:bg-violet-100/80"
                    onClick={() => void clearCollectionNotice()}
                  >
                    Fjern markering
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  className="mt-4 h-11 w-full rounded-md border-2 border-violet-400 bg-violet-700 font-semibold text-white hover:bg-violet-800"
                  onClick={() => void registerCollectionNotice()}
                >
                  Registrer innkassovarsel sendt
                </Button>
              )}
            </section>

            <section aria-labelledby="booking-edit-notes">
              <h3 id="booking-edit-notes" className={cn(labelClass, "mb-2")}>
                Notater på bookingen
              </h3>
              <p
                id="booking-edit-notes-hint"
                className="mb-3 text-sm leading-relaxed text-muted-foreground"
              >
                Teksten er hentet fra bookingens lagrede notatfelt i databasen
                (inkl. tekst som ble lagret ved ny bestilling). Du kan redigere
                den her og oppdatere med «Lagre endringer».
              </p>
              <Textarea
                {...register("notes")}
                rows={6}
                className={cn(
                  fieldClass,
                  "min-h-32 py-3 text-sm md:text-base",
                )}
                aria-invalid={!!errors.notes}
                aria-describedby="booking-edit-notes-hint"
                placeholder="Ingen notater lagret. Skriv her hvis du vil legge til mer."
              />
              {errors.notes ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors.notes.message}
                </p>
              ) : null}
            </section>
          </div>

          <SheetFooter className="mt-0 flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer/50 p-6 sm:flex-row sm:flex-wrap sm:justify-stretch">
            <Button
              type="submit"
              variant="success"
              size="cta"
              disabled={busy}
              className="w-full sm:order-first sm:flex-1"
            >
              <Save className="mr-2 size-4 shrink-0" aria-hidden />
              Lagre endringer
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
                Bekreft booking
              </Button>
            ) : null}
            {bookingRow.status === "pending" ||
            bookingRow.status === "confirmed" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="h-11 w-full rounded-md border-2 border-red-200 bg-red-50/80 font-semibold text-red-900 hover:border-red-300 hover:bg-red-100 sm:flex-1"
                onClick={() =>
                  onSetStatus(bookingRow.id, "cancelled", {
                    confirmMessage:
                      "Er du sikker på at du vil avbestille denne bookingen? Status settes til Avbestilt.",
                  })
                }
              >
                <XCircle className="mr-2 size-4 shrink-0" aria-hidden />
                Avbestill
              </Button>
            ) : null}
            {bookingRow.status === "cancelled" ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="h-11 w-full rounded-md border-2 border-rn-border-strong font-semibold sm:flex-1"
                onClick={() =>
                  onSetStatus(bookingRow.id, "pending", {
                    confirmMessage:
                      "Flytte denne bookingen tilbake til «Avventer»?",
                  })
                }
              >
                Til avventer
              </Button>
            ) : null}
            {canDeleteBooking ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="h-11 w-full rounded-md border-2 border-destructive/40 text-base font-semibold text-destructive hover:bg-destructive/10 sm:w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 size-4 shrink-0" aria-hidden />
                Slett booking
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
            <DialogTitle className="font-heading text-xl font-bold text-rn-text-heading">
              Slette booking?
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-muted-foreground">
              «{bookingRow.customer}», {bookingRow.date}. Dette kan ikke angres.
              Kunden beholdes i Kunder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-md border-2 border-rn-border-strong sm:w-auto"
              disabled={deleteBusy}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              disabled={deleteBusy}
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-11 w-full rounded-md border-2 border-red-200 bg-red-600 font-semibold text-white hover:bg-red-700 sm:w-auto",
              )}
              onClick={() => void performDeleteBooking()}
            >
              {deleteBusy ? "Sletter…" : "Ja, slett booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
