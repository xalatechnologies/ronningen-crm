"use client";

import {
  emptyPackageAddonFormValues,
  inquiryHasCommercialSelection,
  type BookingAddonOption,
  type BookingPackageOption,
} from "@/lib/bookings/commercial-lines";
import { InquiryFormBody } from "@/components/inquiries/inquiry-form-body";
import { Button, buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import {
  bookingInquiryFormSchema,
  estimateNewBookingTotalNok,
  type BookingInquiryFormInput,
} from "@/lib/validations";
import { parseNokFormValue } from "@/lib/bookings/parse-nok-form-value";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { notifyInquiryCreated } from "@/lib/notifications/actions/org-events";
import { generateClientRequestId } from "@/lib/customers/customer-identity";
import { redirectAfterCreate } from "@/lib/navigation/redirect-after-create";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { createInquiryAtomic } from "@/lib/reservations/atomic-create";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

function fromDatetimeLocalValue(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type NewInquiryFormProps = {
  properties: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  packages?: BookingPackageOption[];
  addons?: BookingAddonOption[];
  canManageInquiries: boolean;
  /** Prefill «Eksisterende kunde» when opening from f.eks. ?customerId= */
  initialCustomerId?: string;
};

const defaultFormValues: BookingInquiryFormInput = {
  customerId: "",
  newCustomerName: "",
  newCustomerPhone: "",
  newCustomerEmail: "",
  newCustomerAddress: "",
  propertyId: "",
  eventType: "Privat",
  festType: "",
  preferredEventDate: "",
  preferredEventEndDate: "",
  guestCount: 0,
  estimatedTotal: undefined,
  ...emptyPackageAddonFormValues,
  status: "new",
  nextFollowUpAt: "",
  internalNotes: "",
};

export function NewInquiryForm({
  properties,
  customers,
  packages = [],
  addons = [],
  canManageInquiries,
  initialCustomerId,
}: NewInquiryFormProps) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateInquiries } = useTenantDataInvalidation();
  const router = useRouter();
  const clientRequestIdRef = useRef(generateClientRequestId());
  const submitInFlightRef = useRef(false);

  const form = useForm<BookingInquiryFormInput>({
    resolver: zodResolver(bookingInquiryFormSchema) as Resolver<
      BookingInquiryFormInput,
      unknown,
      BookingInquiryFormInput
    >,
    defaultValues: {
      ...defaultFormValues,
      customerId:
        initialCustomerId &&
        customers.some((c) => c.id === initialCustomerId)
          ? initialCustomerId
          : "",
    },
  });

  const {
    register,
    setValue,
    control,
    watch,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = form;

  const packageSourceW = useWatch({ control, name: "packageSource" });
  const selectedPackageIdW = useWatch({ control, name: "selectedPackageId" });
  const selectedAddonIdsW = useWatch({ control, name: "selectedAddonIds" }) ?? [];
  const customPackagePriceW = useWatch({ control, name: "customPackagePrice" });
  const customAddonLinesW = useWatch({ control, name: "customAddonLines" }) ?? [];
  const packageCatalog = useMemo(
    () => packages.map(({ id, price }) => ({ id, price: Number(price) })),
    [packages],
  );
  const addonCatalog = useMemo(
    () => addons.map(({ id, price }) => ({ id, price: Number(price) })),
    [addons],
  );
  const packageEstimate = useMemo(
    () =>
      estimateNewBookingTotalNok(
        {
          packageSource: packageSourceW ?? "catalog",
          selectedPackageId: String(selectedPackageIdW ?? ""),
          selectedAddonIds: Array.isArray(selectedAddonIdsW) ? selectedAddonIdsW : [],
          customPackagePrice: parseNokFormValue(customPackagePriceW),
          customAddonLines: Array.isArray(customAddonLinesW)
            ? customAddonLinesW.map((row) => ({
                name: String(row?.name ?? ""),
                priceNok: parseNokFormValue(row?.priceNok),
              }))
            : [],
        },
        packageCatalog,
        addonCatalog,
      ),
    [
      packageSourceW,
      selectedPackageIdW,
      selectedAddonIdsW,
      customPackagePriceW,
      customAddonLinesW,
      packageCatalog,
      addonCatalog,
    ],
  );
  const prevEstimateRef = useRef(0);
  useEffect(() => {
    const current = parseNokFormValue(getValues("estimatedTotal"));
    const agreed = Number.isFinite(current) ? current : prevEstimateRef.current;
    if (agreed === prevEstimateRef.current) {
      const next = packageEstimate > 0 ? packageEstimate : undefined;
      if (next === undefined && !(current > 0)) {
        prevEstimateRef.current = 0;
        return;
      }
      setValue("estimatedTotal", next, { shouldValidate: true });
    }
    prevEstimateRef.current = packageEstimate;
  }, [packageEstimate, getValues, setValue]);

  async function onSubmit(data: BookingInquiryFormInput) {
    if (!supabase || !canManageInquiries) return;
    if (submitInFlightRef.current || isSubmitting) return;
    submitInFlightRef.current = true;

    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      submitInFlightRef.current = false;
      toast.error(
        err instanceof Error ? err.message : t("common.toasts.noActiveOrg"),
      );
      return;
    }

    const selectedCustomer = data.customerId
      ? customers.find((c) => c.id === data.customerId)
      : null;

    try {
      const result = await createInquiryAtomic(supabase, {
        organization_id: orgId,
        client_request_id: clientRequestIdRef.current,
        customer_id: data.customerId || null,
        customer_name: selectedCustomer?.name ?? data.newCustomerName.trim(),
        customer_email: data.newCustomerEmail.trim() || null,
        customer_phone: data.newCustomerPhone.trim() || null,
        customer_address: data.newCustomerAddress.trim() || null,
        property_id: data.propertyId || null,
        event_type: data.eventType,
        fest_type: data.festType.trim() || null,
        preferred_event_date: data.preferredEventDate.trim() || null,
        preferred_event_end_date: data.preferredEventEndDate.trim() || null,
        guest_count: data.guestCount,
        estimated_total:
          data.estimatedTotal === undefined || Number.isNaN(data.estimatedTotal)
            ? null
            : data.estimatedTotal,
        status: data.status,
        next_follow_up_at: fromDatetimeLocalValue(data.nextFollowUpAt),
        internal_notes: data.internalNotes?.trim() || null,
      });

      const commercial = {
        packageSource: data.packageSource,
        selectedPackageId: data.selectedPackageId,
        customPackageName: data.customPackageName,
        customPackagePrice: data.customPackagePrice,
        customPackageFeatures: data.customPackageFeatures,
        selectedAddonIds: data.selectedAddonIds,
        customAddonLines: data.customAddonLines,
      };
      if (inquiryHasCommercialSelection(commercial)) {
        const { error: commercialError } = await supabase
          .from("booking_inquiries")
          .update({ commercial } as never)
          .eq("id", result.reservationId)
          .eq("organization_id", orgId);
        if (commercialError) {
          toast.error(t("inquiries.createFailed"), {
            description: commercialError.message,
          });
          return;
        }
      }

      void notifyInquiryCreated({
        organizationId: orgId,
        inquiryId: result.reservationId,
      });

      invalidateInquiries();
      toast.success(t("inquiries.registered"));
      clientRequestIdRef.current = generateClientRequestId();
      redirectAfterCreate(router, "/app/inquiries");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("inquiries.form.unknownError");
      toast.error(t("inquiries.createFailed"), { description: message });
    } finally {
      submitInFlightRef.current = false;
    }
  }

  if (!canManageInquiries) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 pb-12">
        <div
          className={cn(
            "rounded-lg border-2 border-rn-border-strong bg-card p-6 shadow-rn-card",
          )}
        >
          <p className="text-rn-text-body">
            {t("inquiries.form.noAccess")}
          </p>
          <Link
            href="/app/inquiries"
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "inline-flex")}
          >
            {t("inquiries.backToInquiries")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full pb-12 md:pb-8">
      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <header className="flex items-center gap-3 border-b-2 border-rn-border-strong bg-card px-3 py-3 sm:gap-4 sm:px-4 md:px-5">
          <Link
            href="/app/inquiries"
            aria-label={t("inquiries.backToInquiries")}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
            )}
          >
            <ArrowLeft className="size-5 text-success" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading sm:text-2xl md:text-3xl">
              {t("inquiries.new")}
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm md:text-base md:leading-relaxed">
              {t("inquiries.form.subtitle")}
            </p>
          </div>
          <Link
            href="/app/inquiries"
            aria-label={t("inquiries.closeGoToInquiries")}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
            )}
          >
            <X className="size-5 text-rn-text-slate" aria-hidden />
          </Link>
        </header>

        <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col bg-card px-6 py-6 sm:px-8 sm:py-7">
            <InquiryFormBody
              register={register}
              setValue={setValue}
              control={control}
              watch={watch}
              errors={errors}
              properties={properties}
              customers={customers}
              packages={packages}
              addons={addons}
              layout="sectioned"
            />
          </div>
          <div className="flex flex-col gap-3 border-t-2 border-rn-border-strong bg-muted/35 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
            <Link
              href="/app/inquiries"
              className={cn(
                buttonVariants({ variant: "outline", size: "cta" }),
                "inline-flex items-center justify-center border-2 border-rn-border-strong font-heading font-bold",
              )}
            >
              {t("common.actions.cancel")}
            </Link>
            <Button type="submit" variant="success" size="cta" disabled={isSubmitting}>
              {isSubmitting ? t("inquiries.registering") : t("inquiries.register")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
