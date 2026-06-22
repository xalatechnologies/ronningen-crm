"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { TimePickerField } from "@/components/ui/time-picker-field";
import { Label } from "@/components/ui/label";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
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
  type NewBookingFestTypeField,
  type NewBookingFormInput,
} from "@/lib/validations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import {
  referenceYearFromEventDate,
  suggestNextBookingReference,
} from "@/lib/bookings/booking-reference";
import { notifyBookingCreated } from "@/lib/notifications/actions/org-events";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Calendar,
  Copy,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Resolver,
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-app-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-app-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const sectionIconWrap = "text-rn-text-slate";

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

function mapInquiryFestToForm(stored: string | null): {
  festType: NewBookingFestTypeField;
  festTypeCustom: string;
} {
  const t = stored?.trim() ?? "";
  if (!t) {
    return {
      festType: NEW_BOOKING_FEST_TYPE_PRESETS[0] ?? NEW_BOOKING_FEST_TYPE_ANNET,
      festTypeCustom: "",
    };
  }
  if ((NEW_BOOKING_FEST_TYPE_PRESETS as readonly string[]).includes(t)) {
    return { festType: t as NewBookingFestTypeField, festTypeCustom: "" };
  }
  return {
    festType: NEW_BOOKING_FEST_TYPE_ANNET,
    festTypeCustom: t,
  };
}

export type ExistingCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

/** Forhåndsutfylling fra forespørsel ved /bookings/new?inquiryId= */
export type InquiryPrefill = {
  inquiryId: string;
  propertyId: string | null;
  eventType: "Bedrift" | "Privat";
  festType: string | null;
  preferredEventDate: string | null;
  preferredEventEndDate: string | null;
  guestCount: number;
  estimatedTotal: number | null;
  internalNotes: string | null;
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
  /** Når satt: fyller skjema fra forespørsel og kobler konvertering etter lagring. */
  inquiryPrefill?: InquiryPrefill | null;
};

export function NewBookingForm({
  existingCustomer = null,
  bookingAddons,
  bookingPackages,
  inquiryPrefill = null,
}: NewBookingFormProps) {
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateBookings, invalidateInquiries } = useTenantDataInvalidation();
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
  const defaultPackageSource =
    sortedPackages.length > 0 ? ("catalog" as const) : ("custom" as const);
  const defaultAgreedTotal =
    sortedPackages.length > 0 ? defaultPackagePrice : 0;

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
      eventEndDate: "",
      eventStartTime: "",
      eventEndTime: "",
      guestCount: 1,
      packageSource: defaultPackageSource,
      selectedPackageId: defaultPackageId,
      customPackageName: "",
      customPackagePrice: 0,
      customAddonLines: [],
      selectedAddonIds: [],
      depositPaid: 0,
      agreedTotal: defaultAgreedTotal,
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

  const { fields: customAddonFields, append: appendCustomAddon, remove: removeCustomAddon } =
    useFieldArray({
      control,
      name: "customAddonLines",
    });

  const selectedPackageId = useWatch({ control, name: "selectedPackageId" });
  const packageSource = useWatch({ control, name: "packageSource" });
  const festType = useWatch({ control, name: "festType" });
  const eventDate = useWatch({ control, name: "eventDate" });
  const watched = useWatch({ control });
  const referenceYear = useMemo(
    () => referenceYearFromEventDate(eventDate),
    [eventDate],
  );
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);
  const didAutoGenerateRef = useRef(false);
  const selectedAddonIds = watched?.selectedAddonIds ?? [];

  useEffect(() => {
    if (sortedPackages.length === 0) {
      setValue("packageSource", "custom", { shouldValidate: true });
      setValue("selectedPackageId", "", { shouldValidate: true });
    }
  }, [sortedPackages.length, setValue]);

  const inquiryApplyRef = useRef(false);
  useEffect(() => {
    if (!inquiryPrefill || inquiryApplyRef.current) return;
    inquiryApplyRef.current = true;
    const { festType: ft, festTypeCustom: ftc } = mapInquiryFestToForm(
      inquiryPrefill.festType,
    );
    setValue("eventType", inquiryPrefill.eventType, { shouldValidate: true });
    setValue("festType", ft, { shouldValidate: true });
    setValue("festTypeCustom", ftc, { shouldValidate: true });
    setValue("guestCount", Math.max(1, inquiryPrefill.guestCount), {
      shouldValidate: true,
    });
    const today = todayLocalYmd();
    let start = inquiryPrefill.preferredEventDate?.trim() ?? "";
    if (!start || start < today) start = today;
    setValue("eventDate", start, { shouldValidate: true });
    const end = inquiryPrefill.preferredEventEndDate?.trim() ?? "";
    if (end && end >= start) {
      setValue("eventEndDate", end, { shouldValidate: true });
    } else {
      setValue("eventEndDate", "", { shouldValidate: true });
    }
    const est = inquiryPrefill.estimatedTotal;
    if (est != null && est > 0) {
      setValue("packageSource", "custom", { shouldValidate: true });
      setValue("selectedPackageId", "", { shouldValidate: true });
      setValue("customPackageName", "Avtalt pris (forespørsel)", {
        shouldValidate: true,
      });
      setValue("customPackagePrice", est, { shouldValidate: true });
      setValue("agreedTotal", est, { shouldValidate: true });
    }
    const note = inquiryPrefill.internalNotes?.trim();
    if (note) {
      setValue("notes", note, { shouldValidate: true });
    }
  }, [inquiryPrefill, setValue]);

  const estimatedTotal = useMemo(() => {
    if (!watched) return 0;
    const src =
      (watched.packageSource as "catalog" | "custom") ?? defaultPackageSource;
    const pkgId = String(watched.selectedPackageId ?? "");
    const ids = Array.isArray(watched.selectedAddonIds)
      ? watched.selectedAddonIds
      : [];
    const customPriceRaw = watched.customPackagePrice;
    const customPrice =
      typeof customPriceRaw === "number"
        ? customPriceRaw
        : Number.parseFloat(String(customPriceRaw ?? 0));
    const linesRaw = watched.customAddonLines;
    const lines = Array.isArray(linesRaw)
      ? linesRaw.map((row) => {
          const r = row as { name?: string; priceNok?: unknown };
          const p =
            typeof r?.priceNok === "number"
              ? r.priceNok
              : Number.parseFloat(String(r?.priceNok ?? 0));
          return {
            name: String(r?.name ?? ""),
            priceNok: Number.isFinite(p) ? p : 0,
          };
        })
      : [];
    return estimateNewBookingTotalNok(
      {
        packageSource: src,
        selectedPackageId: pkgId,
        selectedAddonIds: ids,
        customPackagePrice: Number.isFinite(customPrice) ? customPrice : 0,
        customAddonLines: lines,
      },
      packageCatalog,
      addonCatalog,
    );
  }, [watched, packageCatalog, addonCatalog, defaultPackageSource]);

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

  const generateBookingReference = useCallback(
    async (options?: { force?: boolean }) => {
      let orgId: string;
      try {
        orgId = requireOrganizationId(currentOrganizationId);
      } catch {
        return;
      }

      const current = getValues("bookingReference").trim();
      if (!options?.force && current) return;

      setIsGeneratingReference(true);
      try {
        const next = await suggestNextBookingReference(
          supabase,
          orgId,
          referenceYear,
        );
        setValue("bookingReference", next, { shouldValidate: true });
      } catch (err) {
        toast.error("Kunne ikke generere referanse", {
          description:
            err instanceof Error ? err.message : "Prøv igjen eller skriv inn selv.",
        });
      } finally {
        setIsGeneratingReference(false);
      }
    },
    [currentOrganizationId, getValues, referenceYear, setValue, supabase],
  );

  useEffect(() => {
    if (didAutoGenerateRef.current || savedBookingId) return;
    if (!currentOrganizationId) return;
    if (getValues("bookingReference").trim()) return;
    didAutoGenerateRef.current = true;
    void generateBookingReference();
  }, [
    currentOrganizationId,
    generateBookingReference,
    getValues,
    savedBookingId,
  ]);

  async function submitBooking(data: NewBookingFormInput) {
    if (savedBookingId) return;

    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
      );
      return;
    }

    let bookingReference = data.bookingReference.trim();
    if (!bookingReference) {
      try {
        bookingReference = await suggestNextBookingReference(
          supabase,
          orgId,
          referenceYearFromEventDate(data.eventDate),
        );
      } catch (err) {
        toast.error("Kunne ikke generere referansenummer", {
          description:
            err instanceof Error ? err.message : "Skriv inn referanse manuelt.",
        });
        return;
      }
    }

    const estimated = estimateNewBookingTotalNok(
      {
        packageSource: data.packageSource,
        selectedPackageId: data.selectedPackageId,
        selectedAddonIds: data.selectedAddonIds,
        customPackagePrice: data.customPackagePrice,
        customAddonLines: data.customAddonLines,
      },
      packageCatalog,
      addonCatalog,
    );
    const total = data.agreedTotal;
    const discountNok = Math.max(0, estimated - total);
    const nameById = new Map(bookingAddons.map((a) => [a.id, a.name]));
    const catalogAddOnLabels = data.selectedAddonIds
      .map((id) => nameById.get(id))
      .filter(Boolean) as string[];
    const customAddOnLabels = data.customAddonLines
      .filter((l) => l.name.trim())
      .map((l) => `${l.name.trim()} (${formatNok(l.priceNok)})`);
    const addOnLabels = [...catalogAddOnLabels, ...customAddOnLabels];
    const packageName =
      data.packageSource === "custom"
        ? data.customPackageName.trim()
        : sortedPackages.find((p) => p.id === data.selectedPackageId)?.name ??
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
      bookingReference ? `Referanse: ${bookingReference}` : null,
      data.notes?.trim(),
      addOnLabels.length ? `Tillegg: ${addOnLabels.join(", ")}` : null,
      data.packageSource === "custom"
        ? `Pakke (egen): ${packageName} · ${formatNok(data.customPackagePrice)}`
        : `Pakke: ${packageName}`,
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
          organization_id: orgId,
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
        property_id: inquiryPrefill?.propertyId ?? null,
        fest_type: festTypeStored,
        event_type: data.eventType,
        event_date: data.eventDate,
        event_end_date: data.eventEndDate.trim() || null,
        event_start_time: data.eventStartTime.trim() || null,
        event_end_time: data.eventEndTime.trim() || null,
        guest_count: data.guestCount,
        status: "pending",
        total_price: total,
        paid_amount: paid,
        remaining_amount: remaining,
        notes: notesCombined || null,
        booking_reference: bookingReference,
        payment_status,
        organization_id: orgId,
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

    invalidateBookings();
    if (inquiryPrefill?.inquiryId) {
      invalidateInquiries();
    }

    void notifyBookingCreated({
      organizationId: orgId,
      bookingId: bookingRow.id,
      bookingReference,
    });

    if (inquiryPrefill?.inquiryId) {
      const { error: convErr } = await supabase
        .from("booking_inquiries")
        .update({
          converted_booking_id: bookingRow.id,
          converted_at: new Date().toISOString(),
          status: "converted",
        })
        .eq("id", inquiryPrefill.inquiryId)
        .is("converted_booking_id", null);

      if (convErr) {
        toast.message(
          "Booking opprettet, men forespørsel ble ikke koblet automatisk",
          { description: convErr.message },
        );
      }
    }

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

  const catalogPackageBlocked =
    packageSource === "catalog" && sortedPackages.length === 0;

  return (
    <div className="mx-auto w-full space-y-5 pb-12 md:space-y-6 md:pb-8">
      <header className="flex items-center gap-3 rounded-lg border-2 border-rn-border-strong bg-card px-3 py-3 shadow-rn-card sm:gap-4 sm:px-4 md:px-5">
        <Link
          href="/app/bookings"
          aria-label="Tilbake til bookinger"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
          )}
        >
          <ArrowLeft className="size-5 text-success" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="app-title sm:text-app-2xl md:text-app-3xl">
            Ny reservasjon
          </h1>
          <p className="mt-0.5 text-app-xs leading-snug text-muted-foreground sm:text-app-sm md:text-app-base md:leading-relaxed">
            Registrer arrangement, kunde og økonomi — felles mønster som øvrige
            sider.
          </p>
        </div>
        <Link
          href="/app/bookings"
          aria-label="Lukk og gå til reservasjoner"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
          )}
        >
          <X className="size-5 text-rn-text-slate" aria-hidden />
        </Link>
      </header>

      {existingCustomer ? (
        <div
          className="rounded-md border-2 border-success/35 bg-success/5 px-4 py-3 text-app-sm text-rn-text-body"
          role="status"
        >
          Ny reservasjon for eksisterende kunde — navn, telefon og e-post kan ikke
          endres her når de allerede er registrert. Mangler telefon eller
          adresse, kan du fylle dem inn nedenfor; de lagres på kunden ved
          booking.
        </div>
      ) : null}

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        {/* RHF handleSubmit uses internal refs; keep handler passed as its callback. */}
        <form
          // eslint-disable-next-line react-hooks/refs -- react-hook-form integration
          onSubmit={handleSubmit((values) =>
            submitBooking(values as NewBookingFormInput),
          )}
          className="flex flex-col"
        >
        {savedBookingId ? (
          <div
            className="border-b-2 border-success/40 bg-success/10 px-6 py-3 text-app-sm md:px-8"
            role="status"
          >
            <p className="font-semibold text-success">Booking lagret</p>
            <p className="text-app-xs text-muted-foreground">
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
              <Label className={labelClass}>Referansenummer</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input
                  className={cn(fieldClass, "font-mono text-app-sm sm:flex-1")}
                  placeholder="RN-2026-013 eller eget saksnummer"
                  disabled={!!savedBookingId}
                  {...register("bookingReference")}
                  aria-invalid={!!errors.bookingReference}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!!savedBookingId || isGeneratingReference}
                  className="h-11 shrink-0 gap-2 rounded-md border-2 border-rn-border-strong px-4 font-heading text-app-sm font-semibold md:h-12"
                  onClick={() => void generateBookingReference({ force: true })}
                >
                  <RefreshCw
                    className={cn(
                      "size-4",
                      isGeneratingReference && "animate-spin",
                    )}
                    aria-hidden
                  />
                  Generer referanse
                </Button>
              </div>
              {errors.bookingReference ? (
                <p className="text-app-xs text-destructive">
                  {errors.bookingReference.message}
                </p>
              ) : (
                <p className="text-app-xs text-muted-foreground">
                  Fylles ut automatisk som RN-{referenceYear}-xxx, eller skriv inn
                  eget saksnummer. System-ID (UUID) vises under etter lagring.
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
                      "flex min-h-11 items-center bg-rn-surface-segment break-all font-mono text-app-sm text-rn-text-heading md:min-h-12",
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
            <h3 className="app-card-title md:text-app-xl">
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
                <p className="text-app-xs text-destructive">
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
                <p className="text-app-xs text-destructive">{errors.phone.message}</p>
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
                <p className="text-app-xs text-destructive">{errors.email.message}</p>
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
                <p className="text-app-xs text-destructive">{errors.address.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-b-2 border-rn-border-strong bg-rn-surface-wash p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Calendar className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="app-card-title md:text-app-xl">
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
                <FormSelectField
                  name="festType"
                  control={control}
                  placeholder="Velg…"
                  className={cn(errors.festType && "border-destructive")}
                  options={[
                    ...toStringOptions(NEW_BOOKING_FEST_TYPE_PRESETS),
                    {
                      value: NEW_BOOKING_FEST_TYPE_ANNET,
                      label: "Annet (eget)",
                    },
                  ]}
                />
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
                      <p className="text-app-xs text-destructive">
                        {errors.festTypeCustom.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {errors.festType ? (
                  <p className="text-app-xs text-destructive">
                    {errors.festType.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>
                  Bedrift eller privat
                  <RequiredMark />
                </Label>
                <FormSelectField
                  name="eventType"
                  control={control}
                  placeholder="Velg…"
                  className={cn(errors.eventType && "border-destructive")}
                  options={[
                    { value: "Bedrift", label: "Bedrift" },
                    { value: "Privat", label: "Privat" },
                  ]}
                />
                {errors.eventType ? (
                  <p className="text-app-xs text-destructive">
                    {errors.eventType.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <div className="space-y-2 md:col-span-2">
                <p className="text-app-xs leading-relaxed text-muted-foreground md:text-app-sm">
                  <span className="font-medium text-foreground">Periode:</span>{" "}
                  du kan legge inn siste arrangementsdag og valgfri start-/slutttid
                  (f.eks.{" "}
                  <span className="whitespace-nowrap tabular-nums">
                    01.07.2027 17:00 – 04.07.2027 17:00
                  </span>
                  ).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-booking-event-date" className={labelClass}>
                  Fra dato
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
                        "bg-background px-3.5 shadow-sm md:h-12 md:px-4 md:text-app-base",
                        errors.eventDate && "border-destructive",
                      )}
                      aria-invalid={!!errors.eventDate}
                    />
                  )}
                />
                {errors.eventDate ? (
                  <p className="text-app-xs text-destructive">
                    {errors.eventDate.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-booking-event-end-date" className={labelClass}>
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
                      id="new-booking-event-end-date"
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v);
                        void field.onBlur();
                      }}
                      minYmd={todayLocalYmd()}
                      variant="toolbar"
                      className={cn(
                        "bg-background px-3.5 shadow-sm md:h-12 md:px-4 md:text-app-base",
                        errors.eventEndDate && "border-destructive",
                      )}
                      aria-invalid={!!errors.eventEndDate}
                    />
                  )}
                />
                {errors.eventEndDate ? (
                  <p className="text-app-xs text-destructive">
                    {errors.eventEndDate.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-booking-start-time" className={labelClass}>
                  Fra kl.{" "}
                  <span className="font-normal normal-case text-muted-foreground">
                    (valgfri)
                  </span>
                </Label>
                <TimePickerField
                  id="new-booking-start-time"
                  className={cn(
                    fieldClass,
                    errors.eventStartTime && "border-destructive",
                  )}
                  {...register("eventStartTime")}
                  aria-invalid={!!errors.eventStartTime}
                />
                {errors.eventStartTime ? (
                  <p className="text-app-xs text-destructive">
                    {errors.eventStartTime.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-booking-end-time" className={labelClass}>
                  Til kl.{" "}
                  <span className="font-normal normal-case text-muted-foreground">
                    (valgfri)
                  </span>
                </Label>
                <TimePickerField
                  id="new-booking-end-time"
                  className={cn(
                    fieldClass,
                    errors.eventEndTime && "border-destructive",
                  )}
                  {...register("eventEndTime")}
                  aria-invalid={!!errors.eventEndTime}
                />
                {errors.eventEndTime ? (
                  <p className="text-app-xs text-destructive">
                    {errors.eventEndTime.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 md:col-span-2">
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
                  <p className="text-app-xs text-destructive">
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
            <h3 className="app-card-title md:text-app-xl">
              Pakke og tillegg
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <Label className={labelClass}>
                Tjenestepakke
                <RequiredMark />
              </Label>
              {sortedPackages.length > 0 ? (
                <Controller
                  name="packageSource"
                  control={control}
                  render={({ field }) => (
                    <div
                      className="flex flex-wrap gap-3"
                      role="group"
                      aria-label="Pakkekilde"
                    >
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-app-sm font-medium transition-colors",
                          field.value === "catalog"
                            ? "border-success bg-success/5 text-rn-text-heading"
                            : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                        )}
                      >
                        <input
                          type="radio"
                          className="size-4 accent-success"
                          name={field.name}
                          value="catalog"
                          checked={field.value === "catalog"}
                          onChange={() => {
                            field.onChange("catalog");
                            if (defaultPackageId) {
                              setValue("selectedPackageId", defaultPackageId, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }
                          }}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                        Fra priskatalog
                      </label>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-app-sm font-medium transition-colors",
                          field.value === "custom"
                            ? "border-success bg-success/5 text-rn-text-heading"
                            : "border-rn-border-strong hover:bg-rn-surface-row-hover",
                        )}
                      >
                        <input
                          type="radio"
                          className="size-4 accent-success"
                          name={field.name}
                          value="custom"
                          checked={field.value === "custom"}
                          onChange={() => {
                            field.onChange("custom");
                            setValue("selectedPackageId", "", {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          onBlur={field.onBlur}
                        />
                        Egen pakke
                      </label>
                    </div>
                  )}
                />
              ) : (
                <p className="text-app-xs text-rn-text-body">
                  Ingen aktive pakker i{" "}
                  <Link
                    href="/app/pricing"
                    className="font-semibold text-success underline-offset-2 hover:underline"
                  >
                    Priser
                  </Link>
                  . Legg inn <span className="font-medium">egen pakke</span>{" "}
                  under (navn og pris).
                </p>
              )}
              {errors.packageSource ? (
                <p className="text-app-xs text-destructive">
                  {errors.packageSource.message}
                </p>
              ) : null}
              {packageSource === "catalog" && sortedPackages.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {sortedPackages.map((pkg) => {
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
                            <span className="text-app-xs text-muted-foreground">
                              {blurb}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-app-xs font-semibold tabular-nums text-rn-text-slate">
                            {Number(pkg.price) <= 0
                              ? "Pris etter avtale"
                              : formatNok(Number(pkg.price))}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : null}
              {packageSource === "custom" || sortedPackages.length === 0 ? (
                <div className="space-y-3 rounded-md border-2 border-rn-border-strong bg-rn-surface-wash/40 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-booking-custom-pkg-name" className={labelClass}>
                      Pakkenavn (egen)
                      <RequiredMark />
                    </Label>
                    <Input
                      id="new-booking-custom-pkg-name"
                      className={cn(
                        fieldClass,
                        errors.customPackageName && "border-destructive",
                      )}
                      placeholder="F.eks. Helgepakke firma"
                      {...register("customPackageName")}
                      aria-invalid={!!errors.customPackageName}
                    />
                    {errors.customPackageName ? (
                      <p className="text-app-xs text-destructive">
                        {errors.customPackageName.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-booking-custom-pkg-price" className={labelClass}>
                      Pakkepris (NOK)
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-app-sm font-semibold text-rn-text-slate md:left-4">
                        kr
                      </span>
                      <PriceInput
                        id="new-booking-custom-pkg-price"
                        className={cn(
                          fieldClass,
                          "pl-10 md:pl-11",
                          errors.customPackagePrice && "border-destructive",
                        )}
                        {...register("customPackagePrice")}
                        aria-invalid={!!errors.customPackagePrice}
                      />
                    </div>
                    <p className="text-app-xs text-muted-foreground">
                      Bruk 0 om pris avtales separat — juster «Avtalt total» under.
                    </p>
                    {errors.customPackagePrice ? (
                      <p className="text-app-xs text-destructive">
                        {errors.customPackagePrice.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {errors.selectedPackageId ? (
                <p className="text-app-xs text-destructive">
                  {errors.selectedPackageId.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-4">
              <Label className={labelClass}>Tillegg</Label>
              <p className="text-app-xs text-rn-text-body">
                Velg fra katalog (synkronisert med Priser) og/eller legg inn egne
                tillegg med navn og pris — uten å opprette dem i Priser først.
              </p>
              {bookingAddons.length === 0 ? (
                <p className="rounded-md border border-dashed border-rn-border-strong bg-rn-surface-wash/30 px-3 py-2 text-app-xs text-rn-text-body">
                  Ingen aktive katalog-tillegg. Bruk seksjonen «Egne tillegg»
                  under, eller opprett tjenester under{" "}
                  <Link
                    href="/app/pricing"
                    className="font-semibold text-success underline-offset-2 hover:underline"
                  >
                    Priser
                  </Link>
                  .
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
                          <span className="block text-app-sm font-medium leading-snug text-rn-text-heading">
                            {addon.name}
                          </span>
                          <span className="mt-0.5 block text-app-xs tabular-nums text-rn-text-slate">
                            +{formatNok(addon.price)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.selectedAddonIds ? (
                <p className="text-app-xs text-destructive">
                  {errors.selectedAddonIds.message}
                </p>
              ) : null}
              <div className="space-y-3 border-t border-rn-border-strong pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={labelClass}>Egne tillegg</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-md font-semibold"
                    onClick={() => appendCustomAddon({ name: "", priceNok: 0 })}
                    disabled={customAddonFields.length >= 24}
                  >
                    <Plus className="size-4" aria-hidden />
                    Legg til linje
                  </Button>
                </div>
                {customAddonFields.length === 0 ? (
                  <p className="text-app-xs text-muted-foreground">
                    Ingen egne tillegg — valgfritt.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {customAddonFields.map((field, index) => (
                      <li
                        key={field.id}
                        className="flex flex-col gap-2 rounded-md border-2 border-rn-border-strong bg-background p-3 sm:flex-row sm:items-end"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <Label
                            className="text-[11px] font-semibold uppercase tracking-wider text-rn-text-slate"
                            htmlFor={`custom-addon-name-${field.id}`}
                          >
                            Navn
                          </Label>
                          <Input
                            id={`custom-addon-name-${field.id}`}
                            className={cn(
                              fieldClass,
                              errors.customAddonLines?.[index]?.name &&
                                "border-destructive",
                            )}
                            placeholder="F.eks. Ekstra servering søndag"
                            {...register(`customAddonLines.${index}.name`)}
                            aria-invalid={!!errors.customAddonLines?.[index]?.name}
                          />
                          {errors.customAddonLines?.[index]?.name ? (
                            <p className="text-app-xs text-destructive">
                              {errors.customAddonLines[index]?.name?.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="w-full space-y-2 sm:w-40">
                          <Label
                            className="text-[11px] font-semibold uppercase tracking-wider text-rn-text-slate"
                            htmlFor={`custom-addon-price-${field.id}`}
                          >
                            Pris (NOK)
                          </Label>
                          <PriceInput
                            id={`custom-addon-price-${field.id}`}
                            step={50}
                            className={cn(
                              fieldClass,
                              errors.customAddonLines?.[index]?.priceNok &&
                                "border-destructive",
                            )}
                            {...register(`customAddonLines.${index}.priceNok`, {
                              valueAsNumber: true,
                            })}
                            aria-invalid={
                              !!errors.customAddonLines?.[index]?.priceNok
                            }
                          />
                          {errors.customAddonLines?.[index]?.priceNok ? (
                            <p className="text-app-xs text-destructive">
                              {errors.customAddonLines[index]?.priceNok?.message}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeCustomAddon(index)}
                          aria-label="Fjern tilleggslinje"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-app-sm font-semibold text-rn-text-slate md:left-4">
                  kr
                </span>
                <PriceInput
                  className={cn(fieldClass, "pl-10 md:pl-11")}
                  placeholder="0"
                  {...register("depositPaid")}
                  aria-invalid={!!errors.depositPaid}
                />
              </div>
              {errors.depositPaid ? (
                <p className="text-app-xs text-destructive">
                  {errors.depositPaid.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className={labelClass}>
                  Estimert totalpris
                </Label>
                <p className="text-app-xs text-muted-foreground">
                  Beregnet fra pakke (katalog eller egen), valgte katalogtillegg og
                  egne tilleggslinjer (referanse).
                </p>
                <div
                  className={cn(
                    fieldClass,
                    "flex items-center bg-rn-surface-segment px-4 font-heading text-app-lg font-bold tabular-nums text-rn-text-heading md:text-app-xl",
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
                <p className="text-app-xs text-muted-foreground">
                  Sett egen pris ved behov; synkes med estimat til du endrer den
                  selv.
                </p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-app-sm font-semibold text-rn-text-slate md:left-4">
                    kr
                  </span>
                  <PriceInput
                    className={cn(fieldClass, "pl-10 md:pl-11")}
                    {...register("agreedTotal")}
                    aria-invalid={!!errors.agreedTotal}
                  />
                </div>
                {errors.agreedTotal ? (
                  <p className="text-app-xs text-destructive">
                    {errors.agreedTotal.message}
                  </p>
                ) : null}
                {customerDiscountNok > 0 ? (
                  <p
                    className="text-app-sm font-semibold text-success"
                    aria-live="polite"
                  >
                    Rabatt for kunden: {formatNok(customerDiscountNok)}
                    {discountPercent > 0
                      ? ` (${discountPercent} % under estimat)`
                      : null}
                  </p>
                ) : null}
                {aboveEstimateNok > 0 ? (
                  <p className="text-app-sm text-muted-foreground" aria-live="polite">
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
              <p className="text-app-xs text-destructive">{errors.notes.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-rn-border-strong bg-rn-surface-footer px-6 py-5 sm:flex-row sm:justify-end md:px-8">
          <Link
            href="/app/bookings"
            className={cn(
              buttonVariants({ variant: "outline", size: "cta" }),
              "inline-flex items-center justify-center border-2 border-rn-border-strong font-heading font-bold",
            )}
          >
            Avbryt
          </Link>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={
              isSubmitting || catalogPackageBlocked || !!savedBookingId
            }
          >
            {isSubmitting ? "Lagrer…" : "Lagre booking"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
