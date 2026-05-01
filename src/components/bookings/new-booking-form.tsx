"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  bookingPackageListBlurb,
  createNewBookingFormSchema,
  estimateNewBookingTotalNok,
  NEW_BOOKING_FEST_TYPE_ANNET,
  NEW_BOOKING_FEST_TYPE_PRESETS,
  resolveNewBookingFestTypeStored,
  sortBookingPackagesByCatalogOrder,
  todayLocalYmd,
  type BookingAddonCatalogEntry,
  type BookingPackageCatalogEntry,
  type NewBookingFormInput,
} from "@/lib/validations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Calendar, ChevronDown, Copy, Package, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Resolver,
  Controller,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const sectionIconWrap = "text-rn-text-slate";

const selectChevronPad = "pr-10 md:pr-11";

const labelClass =
  "text-[12px] font-semibold uppercase tracking-wider text-rn-text-slate";

function RequiredMark() {
  return (
    <span className="font-semibold text-destructive tabular-nums" aria-hidden>
      {" *"}
    </span>
  );
}

function formatNok(n: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

export type ExistingCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type NewBookingFormFieldValues = Omit<
  NewBookingFormInput,
  "eventType" | "festType"
> & {
  eventType: "" | NewBookingFormInput["eventType"];
  festType: "" | NewBookingFormInput["festType"];
};

export type BookingAddonOption = {
  id: string;
  name: string;
  price: number;
};

export type BookingPackageOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export type NewBookingFormProps = {
  existingCustomer?: ExistingCustomer | null;
  bookingAddons: BookingAddonOption[];
  bookingPackages: BookingPackageOption[];
};

export function NewBookingForm({
  existingCustomer = null,
  bookingAddons,
  bookingPackages,
}: NewBookingFormProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const [savedBookingId, setSavedBookingId] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const sortedPackages = useMemo(
    () => sortBookingPackagesByCatalogOrder(bookingPackages),
    [bookingPackages],
  );

  const packageCatalog: BookingPackageCatalogEntry[] = useMemo(
    () =>
      sortedPackages.map(({ id, price }) => ({
        id,
        price: Number(price),
      })),
    [sortedPackages],
  );

  const defaultPackageId = sortedPackages[0]?.id ?? "";
  const defaultPackagePrice = Number(sortedPackages[0]?.price ?? 0);

  const addonCatalog: BookingAddonCatalogEntry[] = useMemo(
    () => bookingAddons.map(({ id, price }) => ({ id, price: Number(price) })),
    [bookingAddons],
  );

  const formSchema = useMemo(
    () => createNewBookingFormSchema(addonCatalog, packageCatalog),
    [addonCatalog, packageCatalog],
  );

  const form = useForm<NewBookingFormFieldValues>({
    resolver: zodResolver(
      formSchema,
    ) as Resolver<NewBookingFormFieldValues, unknown, NewBookingFormInput>,
    defaultValues: {
      customerName: existingCustomer?.name ?? "",
      phone: existingCustomer?.phone ?? "",
      email: existingCustomer?.email ?? "",
      address: existingCustomer?.address ?? "",
      festType: "",
      festTypeCustom: "",
      eventType: "",
      eventDate: "",
      guestCount: 1,
      selectedPackageId: defaultPackageId,
      selectedAddonIds: [],
      depositPaid: 0,
      agreedTotal: defaultPackagePrice,
      notes: "",
      bookingReference: "",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const selectedPackageId = useWatch({ control, name: "selectedPackageId" });
  const festType = useWatch({ control, name: "festType" });
  const watched = useWatch({ control });
  const selectedAddonIds = watched?.selectedAddonIds ?? [];

  const estimatedTotal = useMemo(() => {
    const pkgId =
      (watched?.selectedPackageId as string | undefined) || defaultPackageId;
    const ids = Array.isArray(watched?.selectedAddonIds)
      ? watched.selectedAddonIds
      : [];
    return estimateNewBookingTotalNok(
      { selectedPackageId: pkgId, selectedAddonIds: ids },
      packageCatalog,
      addonCatalog,
    );
  }, [watched, packageCatalog, addonCatalog, defaultPackageId]);

  const agreedTotalWatchedRaw = Number(watched?.agreedTotal);
  const agreedTotalWatched = Number.isFinite(agreedTotalWatchedRaw)
    ? agreedTotalWatchedRaw
    : estimatedTotal;

  const prevEstimatedRef = useRef(estimatedTotal);
  useEffect(() => {
    const raw = getValues("agreedTotal");
    const agreedNum =
      typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    const agreedNorm = Number.isFinite(agreedNum)
      ? agreedNum
      : prevEstimatedRef.current;
    if (agreedNorm === prevEstimatedRef.current) {
      setValue("agreedTotal", estimatedTotal, { shouldValidate: true });
    }
    prevEstimatedRef.current = estimatedTotal;
  }, [estimatedTotal, getValues, setValue]);

  const customerDiscountNok = Math.max(0, estimatedTotal - agreedTotalWatched);
  const aboveEstimateNok = Math.max(0, agreedTotalWatched - estimatedTotal);
  const discountPercent =
    estimatedTotal > 0 && customerDiscountNok > 0
      ? Math.round((customerDiscountNok / estimatedTotal) * 100)
      : 0;

  async function submitBooking(data: NewBookingFormInput) {
    if (savedBookingId) return;

    const estimated = estimateNewBookingTotalNok(
      {
        selectedPackageId: data.selectedPackageId,
        selectedAddonIds: data.selectedAddonIds,
      },
      packageCatalog,
      addonCatalog,
    );
    const total = data.agreedTotal;
    const discountNok = Math.max(0, estimated - total);
    const nameById = new Map(bookingAddons.map((a) => [a.id, a.name]));
    const addOnLabels = data.selectedAddonIds
      .map((id) => nameById.get(id))
      .filter(Boolean) as string[];
    const packageName =
      sortedPackages.find((p) => p.id === data.selectedPackageId)?.name ??
      "Pakke";
    const pricingSummary = [
      `Estimert total: ${formatNok(estimated)}`,
      `Avtalt total: ${formatNok(total)}`,
      discountNok > 0 ? `Rabatt (kunde): ${formatNok(discountNok)}` : null,
      total > estimated
        ? `Oppjustert vs. estimat: ${formatNok(total - estimated)}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const parts = [
      pricingSummary,
      data.bookingReference.trim()
        ? `Egen referanse: ${data.bookingReference.trim()}`
        : null,
      data.notes?.trim(),
      addOnLabels.length ? `Tillegg: ${addOnLabels.join(", ")}` : null,
      `Pakke: ${packageName}`,
    ].filter(Boolean);
    const notesCombined = parts.join("\n");

    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      const customerPatch: {
        phone?: string;
        address?: string;
      } = {};
      if (!existingCustomer.phone?.trim() && data.phone.trim()) {
        customerPatch.phone = data.phone.trim();
      }
      if (!existingCustomer.address?.trim() && data.address.trim()) {
        customerPatch.address = data.address.trim();
      }
      if (Object.keys(customerPatch).length > 0) {
        const { error: custErr } = await supabase
          .from("customers")
          .update(customerPatch)
          .eq("id", customerId);
        if (custErr) {
          toast.error("Kunne ikke oppdatere kundefelt", {
            description: custErr.message,
          });
          return;
        }
      }
    } else {
      const { data: customerRow, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: data.customerName,
          phone: data.phone.trim(),
          email: data.email || null,
          address: data.address.trim() || null,
        })
        .select("id")
        .single();

      if (customerError || !customerRow) {
        toast.error("Kunne ikke opprette kunde", {
          description: customerError?.message ?? "Ukjent feil",
        });
        return;
      }
      customerId = customerRow.id;
    }

    const paid = Math.min(data.depositPaid, total);
    const remaining = Math.max(0, total - paid);
    const payment_status =
      paid <= 0 ? "unpaid" : paid >= total ? "paid" : "partial";
    const festTypeStored = resolveNewBookingFestTypeStored(data);

    const { data: bookingRow, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customerId,
        property_id: null,
        fest_type: festTypeStored,
        event_type: data.eventType,
        event_date: data.eventDate,
        guest_count: data.guestCount,
        status: "pending",
        total_price: total,
        paid_amount: paid,
        remaining_amount: remaining,
        notes: notesCombined || null,
        booking_reference: data.bookingReference.trim() || null,
        payment_status,
      })
      .select("id")
      .single();

    if (bookingError || !bookingRow) {
      toast.error("Kunne ikke opprette booking", {
        description: bookingError?.message ?? "Ukjent feil",
      });
      return;
    }

    setSavedBookingId(bookingRow.id);
    toast.success("Booking opprettet", { description: bookingRow.id });

    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    redirectTimerRef.current = setTimeout(() => {
      router.push("/app/bookings");
      router.refresh();
    }, 2200);
  }

  async function copyBookingId() {
    if (!savedBookingId) return;
    try {
      await navigator.clipboard.writeText(savedBookingId);
      toast.message("Booking-ID kopiert");
    } catch {
      toast.error("Kunne ikke kopiere");
    }
  }

  function goToBookingsNow() {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    router.push("/app/bookings");
    router.refresh();
  }

  const noActivePackages = sortedPackages.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-12 md:space-y-6 md:pb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
        <Link
          href="/app/bookings"
          aria-label="Tilbake til bookinger"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "mt-1 shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
          )}
        >
          <ArrowLeft className="size-5 text-success" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-rn-text-heading md:text-4xl">
            Ny booking
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Registrer arrangement, kunde og økonomi — felles mønster som øvrige sider.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-rn-text-heading md:text-3xl">
          Bookingdetaljer
        </h2>
        <p className="text-sm leading-relaxed text-rn-text-body md:text-base">
          Opprett et profesjonelt arrangement for kunden i Rønningen Manager.
        </p>
      </div>

      {existingCustomer ? (
        <div
          className="rounded-md border-2 border-success/35 bg-success/5 px-4 py-3 text-sm text-rn-text-body"
          role="status"
        >
          Ny booking for eksisterende kunde — navn, telefon og e-post kan ikke
          endres her når de allerede er registrert. Mangler telefon eller
          adresse, kan du fylle dem inn nedenfor; de lagres på kunden ved
          booking.
        </div>
      ) : null}

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <form
          onSubmit={handleSubmit((values) =>
            submitBooking(values as NewBookingFormInput),
          )}
          className="flex flex-col"
        >
        {savedBookingId ? (
          <div
            className="border-b-2 border-success/40 bg-success/10 px-6 py-3 text-sm md:px-8"
            role="status"
          >
            <p className="font-semibold text-success">Booking lagret</p>
            <p className="text-xs text-muted-foreground">
              Du sendes til bookinger automatisk. Bruk «Gå til bookinger» for å
              gå med én gang.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 rounded-md border-success/40 text-success hover:bg-success/10"
              onClick={goToBookingsNow}
            >
              Gå til bookinger
            </Button>
          </div>
        ) : null}
        <div className="border-b-2 border-rn-border-strong bg-rn-surface-wash px-6 py-4 md:px-8">
          <div className="flex flex-col gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Label className={labelClass}>Booking-ID / referanse</Label>
              <Input
                className={cn(fieldClass, "font-mono text-sm")}
                placeholder="Valgfritt — f.eks. saksnummer eller eget avtalenummer"
                disabled={!!savedBookingId}
                {...register("bookingReference")}
                aria-invalid={!!errors.bookingReference}
              />
              {errors.bookingReference ? (
                <p className="text-xs text-destructive">
                  {errors.bookingReference.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Skriv inn egen referanse ved behov. System-ID (UUID) vises
                  under etter lagring.
                </p>
              )}
            </div>
            {savedBookingId ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className={labelClass}>System-ID (database)</Label>
                  <div
                    className={cn(
                      fieldClass,
                      "flex min-h-11 items-center bg-rn-surface-segment break-all font-mono text-sm text-rn-text-heading md:min-h-12",
                    )}
                    aria-live="polite"
                  >
                    {savedBookingId}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 shrink-0 gap-2 rounded-md border-2 border-rn-border-strong md:h-12"
                  onClick={copyBookingId}
                >
                  <Copy className="size-4" aria-hidden />
                  Kopier system-ID
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-b-2 border-rn-border-strong bg-card p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <User className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="font-heading text-lg font-semibold text-rn-text-heading md:text-xl">
              Kundeinformasjon
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              <Label className={labelClass}>
                Navn
                <RequiredMark />
              </Label>
              <Input
                className={cn(
                  fieldClass,
                  existingCustomer && "bg-muted/50",
                )}
                placeholder="Ola Nordmann"
                readOnly={!!existingCustomer}
                {...register("customerName")}
                aria-invalid={!!errors.customerName}
              />
              {errors.customerName ? (
                <p className="text-xs text-destructive">
                  {errors.customerName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className={labelClass}>
                Telefon
                <RequiredMark />
              </Label>
              <Input
                className={cn(
                  fieldClass,
                  existingCustomer && existingCustomer.phone?.trim() && "bg-muted/50",
                )}
                type="tel"
                placeholder="+47 000 00 000"
                readOnly={!!existingCustomer && !!existingCustomer.phone?.trim()}
                {...register("phone")}
                aria-invalid={!!errors.phone}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className={labelClass}>
                E-post
              </Label>
              <Input
                className={cn(
                  fieldClass,
                  existingCustomer && "bg-muted/50",
                )}
                type="email"
                placeholder="ola@eksempel.no"
                readOnly={!!existingCustomer}
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className={labelClass}>
                Adresse
              </Label>
              <Textarea
                className={cn(
                  fieldClass,
                  "min-h-24 resize-y py-3",
                  existingCustomer &&
                    existingCustomer.address?.trim() &&
                    "bg-muted/50",
                )}
                placeholder="Gate, postnr og sted"
                rows={3}
                readOnly={
                  !!existingCustomer && !!existingCustomer.address?.trim()
                }
                {...register("address")}
                aria-invalid={!!errors.address}
              />
              {errors.address ? (
                <p className="text-xs text-destructive">{errors.address.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-b-2 border-rn-border-strong bg-rn-surface-wash p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Calendar className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="font-heading text-lg font-semibold text-rn-text-heading md:text-xl">
              Arrangement
            </h3>
          </div>
          <div className="flex flex-col gap-5 md:gap-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <div className="space-y-2">
                <Label className={labelClass}>
                  Festtype
                  <RequiredMark />
                </Label>
                <div className="relative">
                  <select
                    className={cn(
                      fieldClass,
                      selectChevronPad,
                      "w-full appearance-none bg-background",
                      errors.festType && "border-destructive",
                    )}
                    {...register("festType")}
                  >
                    <option value="">Velg…</option>
                    {NEW_BOOKING_FEST_TYPE_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value={NEW_BOOKING_FEST_TYPE_ANNET}>
                      Annet (eget)
                    </option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-rn-text-slate md:right-4"
                    aria-hidden
                  />
                </div>
                {festType === NEW_BOOKING_FEST_TYPE_ANNET ? (
                  <div className="space-y-2 pt-1">
                    <Label className={labelClass}>
                      Beskriv festtype
                      <RequiredMark />
                    </Label>
                    <Input
                      className={cn(
                        fieldClass,
                        errors.festTypeCustom && "border-destructive",
                      )}
                      placeholder="F.eks. jubileum, temafest …"
                      {...register("festTypeCustom")}
                    />
                    {errors.festTypeCustom ? (
                      <p className="text-xs text-destructive">
                        {errors.festTypeCustom.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {errors.festType ? (
                  <p className="text-xs text-destructive">
                    {errors.festType.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>
                  Bedrift eller privat
                  <RequiredMark />
                </Label>
                <div className="relative">
                  <select
                    className={cn(
                      fieldClass,
                      selectChevronPad,
                      "w-full appearance-none bg-background",
                      errors.eventType && "border-destructive",
                    )}
                    {...register("eventType")}
                  >
                    <option value="">Velg…</option>
                    <option value="Bedrift">Bedrift</option>
                    <option value="Privat">Privat</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-rn-text-slate md:right-4"
                    aria-hidden
                  />
                </div>
                {errors.eventType ? (
                  <p className="text-xs text-destructive">
                    {errors.eventType.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="new-booking-event-date" className={labelClass}>
                  Dato
                  <RequiredMark />
                </Label>
                <Controller
                  name="eventDate"
                  control={control}
                  render={({ field }) => (
                    <DatePickerField
                      id="new-booking-event-date"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        void field.onBlur();
                      }}
                      minYmd={todayLocalYmd()}
                      variant="toolbar"
                      className={cn(
                        "bg-background px-3.5 shadow-sm md:h-12 md:px-4 md:text-base",
                        errors.eventDate && "border-destructive",
                      )}
                      aria-invalid={!!errors.eventDate}
                    />
                  )}
                />
                {errors.eventDate ? (
                  <p className="text-xs text-destructive">
                    {errors.eventDate.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>
                  Antall gjester
                  <RequiredMark />
                </Label>
                <Input
                  className={fieldClass}
                  type="number"
                  min={1}
                  {...register("guestCount")}
                  aria-invalid={!!errors.guestCount}
                />
                {errors.guestCount ? (
                  <p className="text-xs text-destructive">
                    {errors.guestCount.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b-2 border-rn-border-strong p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Package className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="font-heading text-lg font-semibold text-rn-text-heading md:text-xl">
              Pakke og tillegg
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <Label className={labelClass}>
                Tjenestepakke
                <RequiredMark />
              </Label>
              <div className="flex flex-col gap-3">
                {noActivePackages ? (
                  <p className="rounded-md border-2 border-dashed border-rn-border-strong bg-rn-surface-wash px-4 py-3 text-sm text-rn-text-body">
                    Ingen aktive pakker. Gå til{" "}
                    <Link
                      href="/app/pricing"
                      className="font-semibold text-success underline-offset-2 hover:underline"
                    >
                      Priser
                    </Link>{" "}
                    og opprett pakkenivåer (de vises her automatisk).
                  </p>
                ) : (
                  sortedPackages.map((pkg) => {
                    const blurb = bookingPackageListBlurb(pkg.description);
                    return (
                      <label
                        key={pkg.id}
                        className={cn(
                          "flex cursor-pointer items-center rounded-md border-2 p-4 transition-colors",
                          selectedPackageId === pkg.id
                            ? "border-success bg-success/5 shadow-sm"
                            : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                        )}
                      >
                        <input
                          type="radio"
                          value={pkg.id}
                          className="size-5 accent-success"
                          {...register("selectedPackageId")}
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <span className="block font-semibold text-rn-text-heading">
                            {pkg.name}
                          </span>
                          {blurb ? (
                            <span className="text-xs text-muted-foreground">
                              {blurb}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-xs font-semibold tabular-nums text-rn-text-slate">
                            {Number(pkg.price) <= 0
                              ? "Pris etter avtale"
                              : formatNok(Number(pkg.price))}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              {errors.selectedPackageId ? (
                <p className="text-xs text-destructive">
                  {errors.selectedPackageId.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-4">
              <Label className={labelClass}>
                Tillegg
              </Label>
              <p className="text-xs text-rn-text-body">
                Hentes fra Priser → tilleggstjenester (aktive rader). Endre
                navn og pris der.
              </p>
              {bookingAddons.length === 0 ? (
                <p className="rounded-md border-2 border-dashed border-rn-border-strong bg-rn-surface-wash px-4 py-3 text-sm text-rn-text-body">
                  Ingen aktive tillegg. Gå til{" "}
                  <Link
                    href="/app/pricing"
                    className="font-semibold text-success underline-offset-2 hover:underline"
                  >
                    Priser
                  </Link>{" "}
                  og opprett tilleggstjenester.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
                  {bookingAddons.map((addon) => {
                    const checked = selectedAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-transparent p-3 transition-colors hover:border-rn-border-strong hover:bg-rn-surface-row-hover"
                      >
                        <input
                          type="checkbox"
                          className="size-5 shrink-0 rounded accent-success"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selectedAddonIds, addon.id]
                              : selectedAddonIds.filter((id) => id !== addon.id);
                            setValue("selectedAddonIds", next, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug text-rn-text-heading">
                            {addon.name}
                          </span>
                          <span className="mt-0.5 block text-xs tabular-nums text-rn-text-slate">
                            +{formatNok(addon.price)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.selectedAddonIds ? (
                <p className="text-xs text-destructive">
                  {errors.selectedAddonIds.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 md:items-start">
            <div className="space-y-2">
              <Label className={labelClass}>
                Betalt depositum (NOK)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-rn-text-slate md:left-4">
                  kr
                </span>
                <Input
                  className={cn(fieldClass, "pl-10 md:pl-11")}
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0"
                  {...register("depositPaid")}
                  aria-invalid={!!errors.depositPaid}
                />
              </div>
              {errors.depositPaid ? (
                <p className="text-xs text-destructive">
                  {errors.depositPaid.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className={labelClass}>
                  Estimert totalpris
                </Label>
                <p className="text-xs text-muted-foreground">
                  Beregnet fra pakke og valgte tillegg (referanse).
                </p>
                <div
                  className={cn(
                    fieldClass,
                    "flex items-center bg-rn-surface-segment px-4 font-heading text-lg font-bold tabular-nums text-rn-text-heading md:text-xl",
                  )}
                  aria-live="polite"
                >
                  {formatNok(estimatedTotal)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>
                  Avtalt totalpris (kunde)
                  <RequiredMark />
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sett egen pris ved behov; synkes med estimat til du endrer den
                  selv.
                </p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-rn-text-slate md:left-4">
                    kr
                  </span>
                  <Input
                    className={cn(fieldClass, "pl-10 md:pl-11")}
                    type="number"
                    min={0}
                    step={100}
                    {...register("agreedTotal")}
                    aria-invalid={!!errors.agreedTotal}
                  />
                </div>
                {errors.agreedTotal ? (
                  <p className="text-xs text-destructive">
                    {errors.agreedTotal.message}
                  </p>
                ) : null}
                {customerDiscountNok > 0 ? (
                  <p
                    className="text-sm font-semibold text-success"
                    aria-live="polite"
                  >
                    Rabatt for kunden: {formatNok(customerDiscountNok)}
                    {discountPercent > 0
                      ? ` (${discountPercent} % under estimat)`
                      : null}
                  </p>
                ) : null}
                {aboveEstimateNok > 0 ? (
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {formatNok(aboveEstimateNok)} over estimat.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-2 md:mt-10">
            <Label className={labelClass}>
              Notater
            </Label>
            <Textarea
              className={cn(
                fieldClass,
                "h-auto min-h-44 resize-y py-3.5 md:min-h-52 md:py-4",
                errors.notes && "border-destructive",
              )}
              placeholder="Kosthold, særskilte ønsker, osv."
              rows={7}
              {...register("notes")}
              aria-invalid={!!errors.notes}
            />
            {errors.notes ? (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 md:px-8">
          <Link
            href="/app/bookings"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "rounded-md font-semibold text-rn-text-body hover:text-rn-text-heading",
            )}
          >
            Avbryt
          </Link>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={isSubmitting || noActivePackages || !!savedBookingId}
          >
            {isSubmitting ? "Lagrer…" : "Lagre booking"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
