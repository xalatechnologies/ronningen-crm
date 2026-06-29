"use client";

import { InquiryFormBody } from "@/components/inquiries/inquiry-form-body";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  bookingInquiryFormSchema,
  type BookingInquiryFormInput,
} from "@/lib/validations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { notifyInquiryCreated } from "@/lib/notifications/actions/org-events";
import { redirectAfterCreate } from "@/lib/navigation/redirect-after-create";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTenantDataInvalidation } from "@/hooks/use-tenant-data-invalidation";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Resolver, useForm } from "react-hook-form";
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
  status: "new",
  nextFollowUpAt: "",
  internalNotes: "",
};

export function NewInquiryForm({
  properties,
  customers,
  canManageInquiries,
  initialCustomerId,
}: NewInquiryFormProps) {
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const { invalidateInquiries } = useTenantDataInvalidation();
  const router = useRouter();

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
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(data: BookingInquiryFormInput) {
    if (!supabase || !canManageInquiries) return;

    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
      );
      return;
    }

    let customerId = data.customerId || "";
    if (!customerId) {
      const { data: custRow, error: custErr } = await supabase
        .from("customers")
        .insert({
          name: data.newCustomerName.trim(),
          phone: data.newCustomerPhone.trim(),
          email: data.newCustomerEmail.trim() || null,
          address: data.newCustomerAddress.trim() || null,
          organization_id: orgId,
        })
        .select("id")
        .single();
      if (custErr || !custRow) {
        toast.error("Kunne ikke opprette kunde", {
          description: custErr?.message ?? "Ukjent feil",
        });
        return;
      }
      customerId = custRow.id;
    }

    const { data: inquiryRow, error } = await supabase
      .from("booking_inquiries")
      .insert({
        customer_id: customerId,
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
        organization_id: orgId,
      })
      .select("id")
      .single();

    if (error || !inquiryRow) {
      toast.error("Kunne ikke opprette forespørsel", {
        description: error?.message ?? "Ukjent feil",
      });
      return;
    }

    void notifyInquiryCreated({
      organizationId: orgId,
      inquiryId: inquiryRow.id,
    });

    invalidateInquiries();
    toast.success("Forespørsel registrert");
    redirectAfterCreate(router, "/app/inquiries");
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
            Du har ikke tilgang til å registrere forespørsler.
          </p>
          <Link
            href="/app/inquiries"
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "inline-flex")}
          >
            Tilbake til forespørsler
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
            aria-label="Tilbake til forespørsler"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
            )}
          >
            <ArrowLeft className="size-5 text-success" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-bold tracking-tight text-rn-text-heading sm:text-2xl md:text-3xl">
              Ny forespørsel
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-sm md:text-base md:leading-relaxed">
              Registrer en henvendelse før booking er bekreftet — samme mønster
              som ny booking.
            </p>
          </div>
          <Link
            href="/app/inquiries"
            aria-label="Lukk og gå til forespørsler"
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
              control={control}
              watch={watch}
              errors={errors}
              properties={properties}
              customers={customers}
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
              Avbryt
            </Link>
            <Button type="submit" variant="success" size="cta" disabled={isSubmitting}>
              {isSubmitting ? "Registrerer …" : "Registrer forespørsel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
