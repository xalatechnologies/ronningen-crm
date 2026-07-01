"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { TimePickerField } from "@/components/ui/time-picker-field";
import { Label } from "@/components/ui/label";
import { FormSelectField, toStringOptions } from "@/components/ui/form-select";
import { AddressField } from "@/components/forms/address-field";
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
  validationMessagesForLocale,
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
import { resolveNewBookingPaymentAmounts } from "@/constants/booking-payment-status";
import { useTranslation } from "@/i18n/client";
import { parseNokFormValue } from "@/lib/bookings/parse-nok-form-value";
import { redirectAfterCreate } from "@/lib/navigation/redirect-after-create";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Calendar,
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
  const { t, formatCurrency, locale } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateBookings, invalidateInquiries } = useTenantDataInvalidation();
  const router = useRouter();

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
    () =>
      createNewBookingFormSchema(
        validationMessagesForLocale(locale),
        addonCatalog,
        packageCatalog,
      ),
    [locale, addonCatalog, packageCatalog],
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
  const selectedAddonIds =
    useWatch({ control, name: "selectedAddonIds" }) ?? [];
  const customPackagePrice = useWatch({ control, name: "customPackagePrice" });
  const customAddonLines =
    useWatch({ control, name: "customAddonLines" }) ?? [];
  const agreedTotalRaw = useWatch({ control, name: "agreedTotal" });
  const depositPaidRaw = useWatch({ control, name: "depositPaid" });
  const referenceYear = useMemo(
    () => referenceYearFromEventDate(eventDate),
    [eventDate],
  );
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);
  const didAutoGenerateRef = useRef(false);

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
      setValue("customPackageName", t("bookings.customPackageFromInquiry"), {
        shouldValidate: true,
      });
      setValue("customPackagePrice", est, { shouldValidate: true });
      setValue("agreedTotal", est, { shouldValidate: true });
    }
    const note = inquiryPrefill.internalNotes?.trim();
    if (note) {
      setValue("notes", note, { shouldValidate: true });
    }
  }, [inquiryPrefill, setValue, t]);

  const estimatedTotal = useMemo(() => {
    const src =
      (packageSource as "catalog" | "custom" | "") || defaultPackageSource;
    const pkgId = String(selectedPackageId ?? "");
    const ids = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const customPrice = parseNokFormValue(customPackagePrice);
    const lines = Array.isArray(customAddonLines)
      ? customAddonLines.map((row) => {
          const r = row as { name?: string; priceNok?: unknown };
          const p = parseNokFormValue(r?.priceNok);
          return {
            name: String(r?.name ?? ""),
            priceNok: p,
          };
        })
      : [];
    return estimateNewBookingTotalNok(
      {
        packageSource: src as "catalog" | "custom",
        selectedPackageId: pkgId,
        selectedAddonIds: ids,
        customPackagePrice: customPrice,
        customAddonLines: lines,
      },
      packageCatalog,
      addonCatalog,
    );
  }, [
    packageSource,
    selectedPackageId,
    selectedAddonIds,
    customPackagePrice,
    customAddonLines,
    packageCatalog,
    addonCatalog,
    defaultPackageSource,
  ]);

  const agreedTotalParsed = parseNokFormValue(agreedTotalRaw);
  const agreedTotalWatched = Number.isFinite(agreedTotalParsed)
    ? agreedTotalParsed
    : estimatedTotal;

  const prevEstimatedRef = useRef(estimatedTotal);
  useEffect(() => {
    const agreedNorm = parseNokFormValue(getValues("agreedTotal"));
    const agreedForSync = Number.isFinite(agreedNorm) ? agreedNorm : prevEstimatedRef.current;
    if (agreedForSync === prevEstimatedRef.current) {
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

  const remainingAfterDeposit = useMemo(
    () =>
      resolveNewBookingPaymentAmounts(
        agreedTotalWatched,
        parseNokFormValue(depositPaidRaw),
      ).remaining,
    [agreedTotalWatched, depositPaidRaw],
  );

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
        toast.error(t("bookings.form.generateRefFailed"), {
          description:
            err instanceof Error ? err.message : t("bookings.tryAgainOrManual"),
        });
      } finally {
        setIsGeneratingReference(false);
      }
    },
    [currentOrganizationId, getValues, referenceYear, setValue, supabase, t],
  );

  useEffect(() => {
    if (didAutoGenerateRef.current) return;
    if (!currentOrganizationId) return;
    if (getValues("bookingReference").trim()) return;
    didAutoGenerateRef.current = true;
    void generateBookingReference();
  }, [currentOrganizationId, generateBookingReference, getValues]);

  async function submitBooking(data: NewBookingFormInput) {
    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
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
        toast.error(t("bookings.form.generateRefNumberFailed"), {
          description:
            err instanceof Error
              ? err.message
              : t("bookings.form.enterRefManually"),
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
    const {
      paid,
      remaining,
      paymentStatus: payment_status,
    } = resolveNewBookingPaymentAmounts(total, data.depositPaid);
    const nameById = new Map(bookingAddons.map((a) => [a.id, a.name]));
    const catalogAddOnLabels = data.selectedAddonIds
      .map((id) => nameById.get(id))
      .filter(Boolean) as string[];
    const customAddOnLabels = data.customAddonLines
      .filter((l) => l.name.trim())
      .map((l) => `${l.name.trim()} (${formatCurrency(l.priceNok)})`);
    const addOnLabels = [...catalogAddOnLabels, ...customAddOnLabels];
    const packageName =
      data.packageSource === "custom"
        ? data.customPackageName.trim()
        : sortedPackages.find((p) => p.id === data.selectedPackageId)?.name ??
          t("bookings.form.defaultPackageName");
    const pricingSummary = [
      t("bookings.form.pricingSummary.estimated", {
        amount: formatCurrency(estimated),
      }),
      t("bookings.form.pricingSummary.agreed", {
        amount: formatCurrency(total),
      }),
      discountNok > 0
        ? t("bookings.form.pricingSummary.discount", {
            amount: formatCurrency(discountNok),
          })
        : null,
      total > estimated
        ? t("bookings.form.pricingSummary.adjusted", {
            amount: formatCurrency(total - estimated),
          })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const parts = [
      pricingSummary,
      bookingReference
        ? t("bookings.form.pricingSummary.reference", { ref: bookingReference })
        : null,
      data.notes?.trim(),
      addOnLabels.length
        ? t("bookings.form.pricingSummary.addons", {
            list: addOnLabels.join(", "),
          })
        : null,
      data.packageSource === "custom"
        ? t("bookings.form.pricingSummary.customPackage", {
            name: packageName,
            amount: formatCurrency(data.customPackagePrice),
          })
        : t("bookings.form.pricingSummary.catalogPackage", { name: packageName }),
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
          toast.error(t("bookings.form.updateCustomerFieldsFailed"), {
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
        toast.error(t("bookings.form.createCustomerFailed"), {
          description: customerError?.message ?? t("bookings.form.unknownError"),
        });
        return;
      }
      customerId = customerRow.id;
    }

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
      toast.error(t("bookings.form.createFailed"), {
        description: bookingError?.message ?? t("bookings.form.unknownError"),
      });
      return;
    }

    toast.success(t("bookings.form.created"), { description: bookingRow.id });

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
        toast.message(t("bookings.createdInquiryNotLinked"), {
          description: convErr.message,
        });
      }
    }

    redirectAfterCreate(router, "/app/bookings");
  }

  const catalogPackageBlocked =
    packageSource === "catalog" && sortedPackages.length === 0;

  const noPackagesHintParts = useMemo(() => {
    const pricingMarker = "\x00PRICING\x00";
    const customMarker = "\x00CUSTOM\x00";
    const text = t("bookings.form.noPackagesHint", {
      pricing: pricingMarker,
      custom: customMarker,
    });
    const [beforePricing, restAfterPricing = ""] = text.split(pricingMarker);
    const [middle, after = ""] = restAfterPricing.split(customMarker);
    return { beforePricing, middle, after };
  }, [t]);

  const noCatalogAddonsHintParts = useMemo(() => {
    const pricingMarker = "\x00PRICING\x00";
    const text = t("bookings.form.noCatalogAddons", {
      pricing: pricingMarker,
    });
    const [beforePricing, after = ""] = text.split(pricingMarker);
    return { beforePricing, after };
  }, [t]);

  return (
    <div className="mx-auto w-full pb-12 md:pb-8">
      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <header className="flex items-center gap-3 border-b-2 border-rn-border-strong bg-card px-3 py-3 sm:gap-4 sm:px-4 md:px-5">
          <Link
            href="/app/bookings"
            aria-label={t("bookings.backToBookings")}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
            )}
          >
            <ArrowLeft className="size-5 text-success" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="app-title sm:text-app-2xl md:text-app-3xl">
              {t("bookings.new")}
            </h1>
            <p className="mt-0.5 text-app-xs leading-snug text-muted-foreground sm:text-app-sm md:text-app-base md:leading-relaxed">
              {t("bookings.form.subtitle")}
            </p>
          </div>
          <Link
            href="/app/bookings"
            aria-label={t("bookings.closeGoToBookings")}
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
            className="border-b-2 border-rn-border-strong bg-success/5 px-4 py-3 text-app-sm text-rn-text-body sm:px-6 md:px-8"
            role="status"
          >
            {t("bookings.form.existingCustomerBanner")}
          </div>
        ) : null}

        {/* RHF handleSubmit uses internal refs; keep handler passed as its callback. */}
        <form
          // eslint-disable-next-line react-hooks/refs -- react-hook-form integration
          onSubmit={handleSubmit((values) =>
            submitBooking(values as NewBookingFormInput),
          )}
          className="flex flex-col"
        >
        <div className="border-b-2 border-rn-border-strong/40 bg-card px-6 py-4 md:px-8">
          <div className="flex flex-col gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Label className={labelClass}>{t("bookings.form.referenceNumber")}</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input
                  className={cn(fieldClass, "font-mono text-app-sm sm:flex-1")}
                  placeholder={t("bookings.form.referencePlaceholder")}
                  {...register("bookingReference")}
                  aria-invalid={!!errors.bookingReference}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isGeneratingReference}
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
                  {t("bookings.form.generateReference")}
                </Button>
              </div>
              {errors.bookingReference ? (
                <p className="text-app-xs text-destructive">
                  {errors.bookingReference.message}
                </p>
              ) : (
                <p className="text-app-xs text-muted-foreground">
                  {t("bookings.form.referenceHint", { year: referenceYear })}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="border-b-2 border-rn-border-strong/40 bg-card p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <User className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="app-card-title md:text-app-xl">
              {t("bookings.form.customerInfo")}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              <Label className={labelClass}>
                {t("common.fields.name")}
                <RequiredMark />
              </Label>
              <Input
                className={cn(
                  fieldClass,
                  existingCustomer && "bg-muted/50",
                )}
                placeholder={t("bookings.form.namePlaceholder")}
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
                {t("common.fields.phone")}
                <RequiredMark />
              </Label>
              <Input
                className={cn(
                  fieldClass,
                  existingCustomer && existingCustomer.phone?.trim() && "bg-muted/50",
                )}
                type="tel"
                placeholder={t("bookings.form.phonePlaceholder")}
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
                {t("common.fields.email")}
              </Label>
              <Input
                className={cn(
                  fieldClass,
                  existingCustomer && "bg-muted/50",
                )}
                type="email"
                placeholder={t("bookings.form.emailPlaceholder")}
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
                {t("common.fields.address")}
              </Label>
              <AddressField
                name="address"
                register={register}
                setValue={setValue}
                className={cn(
                  fieldClass,
                  existingCustomer &&
                    existingCustomer.address?.trim() &&
                    "bg-muted/50",
                )}
                placeholder={t("common.address.placeholder")}
                format="multiline"
                variant="textarea"
                readOnly={
                  !!existingCustomer && !!existingCustomer.address?.trim()
                }
                aria-invalid={!!errors.address}
              />
              {errors.address ? (
                <p className="text-app-xs text-destructive">{errors.address.message}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-b-2 border-rn-border-strong/40 bg-card p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Calendar className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="app-card-title md:text-app-xl">
              {t("bookings.detail.event")}
            </h3>
          </div>
          <div className="flex flex-col gap-5 md:gap-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <div className="space-y-2">
                <Label className={labelClass}>
                  {t("common.fields.type")}
                  <RequiredMark />
                </Label>
                <FormSelectField
                  name="festType"
                  control={control}
                  placeholder={t("common.selectPlaceholder")}
                  className={cn(errors.festType && "border-destructive")}
                  options={[
                    ...toStringOptions(NEW_BOOKING_FEST_TYPE_PRESETS),
                    {
                      value: NEW_BOOKING_FEST_TYPE_ANNET,
                      label: t("bookings.form.festTypeOther"),
                    },
                  ]}
                />
                {festType === NEW_BOOKING_FEST_TYPE_ANNET ? (
                  <div className="space-y-2 pt-1">
                    <Label className={labelClass}>
                      {t("bookings.form.describeType")}
                      <RequiredMark />
                    </Label>
                    <Input
                      className={cn(
                        fieldClass,
                        errors.festTypeCustom && "border-destructive",
                      )}
                      placeholder={t("bookings.form.festTypeCustomPlaceholder")}
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
                  {t("bookings.form.corporateOrPrivate")}
                  <RequiredMark />
                </Label>
                <FormSelectField
                  name="eventType"
                  control={control}
                  placeholder={t("common.selectPlaceholder")}
                  className={cn(errors.eventType && "border-destructive")}
                  options={[
                    { value: "Bedrift", label: t("bookings.corporate") },
                    { value: "Privat", label: t("bookings.private") },
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
                  {t("bookings.form.periodHint", {
                    label: t("bookings.form.periodLabel"),
                    example: "01.07.2027 17:00 – 04.07.2027 17:00",
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-booking-event-date" className={labelClass}>
                  {t("bookings.dateFrom")}
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
                  {t("common.fromTime")}{" "}
                  <span className="font-normal normal-case text-muted-foreground">
                    ({t("common.optional")})
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
                  {t("common.toTime")}{" "}
                  <span className="font-normal normal-case text-muted-foreground">
                    ({t("common.optional")})
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
                  {t("common.guests")}
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

        <div className="border-b-2 border-rn-border-strong/40 bg-card p-6 md:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Package className={cn("size-5", sectionIconWrap)} aria-hidden />
            <h3 className="app-card-title md:text-app-xl">
              {t("bookings.form.packageAndAddons")}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-4">
              <Label className={labelClass}>
                {t("bookings.form.servicePackage")}
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
                      aria-label={t("bookings.form.packageSourceAria")}
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
                        {t("bookings.form.fromCatalog")}
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
                        {t("bookings.form.customPackage")}
                      </label>
                    </div>
                  )}
                />
              ) : (
                <p className="text-app-xs text-rn-text-body">
                  {noPackagesHintParts.beforePricing}
                  <Link
                    href="/app/pricing"
                    className="font-semibold text-success underline-offset-2 hover:underline"
                  >
                    {t("navigation.pricing")}
                  </Link>
                  {noPackagesHintParts.middle}
                  <span className="font-medium">
                    {t("bookings.form.customPackageLabel")}
                  </span>
                  {noPackagesHintParts.after}
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
                              ? t("bookings.form.priceOnAgreement")
                              : formatCurrency(Number(pkg.price))}
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
                      {t("bookings.form.customPackageName")}
                      <RequiredMark />
                    </Label>
                    <Input
                      id="new-booking-custom-pkg-name"
                      className={cn(
                        fieldClass,
                        errors.customPackageName && "border-destructive",
                      )}
                      placeholder={t("bookings.form.customPackageNamePlaceholder")}
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
                      {t("bookings.form.packagePrice")}
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
                      {t("bookings.form.packagePriceHint")}
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
              <Label className={labelClass}>{t("bookings.form.addons")}</Label>
              <p className="text-app-xs text-rn-text-body">
                {t("bookings.form.addonsHint")}
              </p>
              {bookingAddons.length === 0 ? (
                <p className="rounded-md border border-dashed border-rn-border-strong bg-rn-surface-wash/30 px-3 py-2 text-app-xs text-rn-text-body">
                  {noCatalogAddonsHintParts.beforePricing}
                  <Link
                    href="/app/pricing"
                    className="font-semibold text-success underline-offset-2 hover:underline"
                  >
                    {t("navigation.pricing")}
                  </Link>
                  {noCatalogAddonsHintParts.after}
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
                            +{formatCurrency(addon.price)}
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
                  <span className={labelClass}>{t("bookings.form.customAddons")}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-md font-semibold"
                    onClick={() => appendCustomAddon({ name: "", priceNok: 0 })}
                    disabled={customAddonFields.length >= 24}
                  >
                    <Plus className="size-4" aria-hidden />
                    {t("bookings.form.addLine")}
                  </Button>
                </div>
                {customAddonFields.length === 0 ? (
                  <p className="text-app-xs text-muted-foreground">
                    {t("bookings.form.noCustomAddons")}
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
                            {t("common.fields.name")}
                          </Label>
                          <Input
                            id={`custom-addon-name-${field.id}`}
                            className={cn(
                              fieldClass,
                              errors.customAddonLines?.[index]?.name &&
                                "border-destructive",
                            )}
                            placeholder={t("bookings.extraServingPlaceholder")}
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
                            {t("bookings.form.priceNok")}
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
                          aria-label={t("bookings.form.removeAddonLine")}
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

        <div className="bg-card p-6 md:p-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
            <div className="space-y-2">
              <Label className={labelClass}>{t("bookings.form.depositPaid")}</Label>
              <p className="min-h-10 text-app-xs leading-snug text-muted-foreground md:min-h-11">
                {t("bookings.form.depositHint")}
              </p>
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

            <div className="space-y-2">
              <Label className={labelClass}>{t("bookings.form.estimatedTotal")}</Label>
              <p className="min-h-10 text-app-xs leading-snug text-muted-foreground md:min-h-11">
                {t("bookings.form.estimatedHint")}
              </p>
              <div
                className={cn(
                  fieldClass,
                  "flex items-center bg-rn-surface-segment px-4 font-heading text-app-lg font-bold tabular-nums text-rn-text-heading md:text-app-xl",
                )}
                aria-live="polite"
              >
                {formatCurrency(estimatedTotal)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>{t("bookings.form.remainingAmount")}</Label>
              <p className="min-h-10 text-app-xs leading-snug text-muted-foreground md:min-h-11">
                {t("bookings.form.remainingHint")}
              </p>
              <div
                className={cn(
                  fieldClass,
                  "flex items-center bg-rn-surface-segment px-4 font-heading text-app-lg font-bold tabular-nums text-rn-text-heading md:text-app-xl",
                )}
                aria-live="polite"
              >
                {formatCurrency(remainingAfterDeposit)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>
                {t("bookings.form.agreedTotalCustomer")}
                <RequiredMark />
              </Label>
              <p className="min-h-10 text-app-xs leading-snug text-muted-foreground md:min-h-11">
                {t("bookings.form.agreedHint")}
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
                  {t("bookings.form.customerDiscount", {
                    amount: formatCurrency(customerDiscountNok),
                  })}
                  {discountPercent > 0
                    ? t("bookings.form.discountPercent", {
                        percent: discountPercent,
                      })
                    : null}
                </p>
              ) : null}
              {aboveEstimateNok > 0 ? (
                <p className="text-app-sm text-muted-foreground" aria-live="polite">
                  {t("bookings.form.aboveEstimate", {
                    amount: formatCurrency(aboveEstimateNok),
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-8 space-y-2 md:mt-10">
            <Label className={labelClass}>
              {t("common.fields.notes")}
            </Label>
            <Textarea
              className={cn(
                fieldClass,
                "h-auto min-h-44 resize-y py-3.5 md:min-h-52 md:py-4",
                errors.notes && "border-destructive",
              )}
              placeholder={t("bookings.notesPlaceholder")}
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
            {t("common.actions.cancel")}
          </Link>
          <Button
            type="submit"
            variant="success"
            size="cta"
            disabled={isSubmitting || catalogPackageBlocked}
          >
            {isSubmitting ? t("bookings.saving") : t("bookings.form.saveBooking")}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
