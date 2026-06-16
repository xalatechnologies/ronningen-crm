"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  FormSelectField,
  toIdNameOptions,
  toStringOptions,
} from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCOMMODATION_RESERVATION_STATUSES,
  accommodationReservationFormSchema,
  type AccommodationReservationFormInput,
} from "@/lib/validations";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { notifyAccommodationCreated } from "@/lib/notifications/actions/org-events";
import { requireOrganizationId } from "@/lib/organizations/require-organization-id";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { ACCOMMODATION_RESERVATION_LABELS } from "@/components/overnatting/types";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import {
  Controller,
  type Resolver,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-app-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-app-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const labelClass =
  "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-app-xs";

export type NewAccommodationReservationFormProps = {
  units: { id: string; name: string; maxGuests: number; active: boolean }[];
  customers: { id: string; name: string }[];
  canManage: boolean;
  initialCustomerId?: string;
};

export function NewAccommodationReservationForm({
  units,
  customers,
  canManage,
  initialCustomerId,
}: NewAccommodationReservationFormProps) {
  const supabase = useSupabase();
  const { currentOrganizationId } = useCurrentOrganization();
  const router = useRouter();
  const rid = useId().replace(/:/g, "");

  const form = useForm<AccommodationReservationFormInput>({
    resolver: zodResolver(accommodationReservationFormSchema) as Resolver<
      AccommodationReservationFormInput,
      unknown,
      AccommodationReservationFormInput
    >,
    defaultValues: {
      customerId:
        initialCustomerId &&
        customers.some((c) => c.id === initialCustomerId)
          ? initialCustomerId
          : "",
      newCustomerName: "",
      newCustomerPhone: "",
      newCustomerEmail: "",
      newCustomerAddress: "",
      unitId: units.find((u) => u.active)?.id ?? "",
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

  const customerId = form.watch("customerId");
  const showNewCustomer = !customerId;

  async function onSubmit(data: AccommodationReservationFormInput) {
    if (!supabase || !canManage) return;

    let orgId: string;
    try {
      orgId = requireOrganizationId(currentOrganizationId);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ingen aktiv organisasjon.",
      );
      return;
    }

    let custId = data.customerId || "";
    if (!custId) {
      const { data: row, error: ce } = await supabase
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
      if (ce || !row) {
        toast.error("Kunne ikke opprette kunde", {
          description: ce?.message ?? "Ukjent feil",
        });
        return;
      }
      custId = row.id;
    }

    const { data: reservationRow, error } = await supabase
      .from("accommodation_reservations")
      .insert({
        unit_id: data.unitId,
        customer_id: custId,
        check_in_date: data.checkInDate,
        check_out_date: data.checkOutDate,
        check_in_time: data.checkInTime === "" ? null : data.checkInTime,
        check_out_time: data.checkOutTime === "" ? null : data.checkOutTime,
        status: data.status,
        guest_count: data.guestCount,
        notes: data.notes?.trim() || null,
        total_price:
          data.totalPrice === undefined || Number.isNaN(data.totalPrice)
            ? null
            : data.totalPrice,
        organization_id: orgId,
      })
      .select("id")
      .single();

    if (error || !reservationRow) {
      toast.error("Kunne ikke registrere reservasjon", {
        description: error?.message ?? "Ukjent feil",
      });
      return;
    }

    void notifyAccommodationCreated({
      organizationId: orgId,
      reservationId: reservationRow.id,
    });

    toast.success("Reservasjon registrert");
    router.push("/app/overnatting");
    router.refresh();
  }

  if (!canManage) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 pb-12">
        <div className="rounded-lg border-2 border-rn-border-strong bg-card p-6 shadow-rn-card">
          <p className="text-rn-text-body">
            Du har ikke tilgang til å opprette overnatting-reservasjoner.
          </p>
          <Link
            href="/app/overnatting"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "mt-4 inline-flex",
            )}
          >
            Tilbake til overnatting
          </Link>
        </div>
      </div>
    );
  }

  const activeUnits = units.filter((u) => u.active);

  return (
    <div className="mx-auto w-full space-y-5 pb-12 md:space-y-6 md:pb-8">
      <header className="flex items-center gap-3 rounded-lg border-2 border-rn-border-strong bg-card px-3 py-3 shadow-rn-card sm:gap-4 sm:px-4 md:px-5">
        <Link
          href="/app/overnatting"
          aria-label="Tilbake til overnatting"
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
            Kobler kunde til enhet og oppholdsperiode under «Tidspunkt» lenger ned.
          </p>
        </div>
        <Link
          href="/app/overnatting"
          aria-label="Lukk"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 rounded-full border-2 border-transparent text-rn-text-heading hover:border-rn-border-strong/60 hover:bg-rn-surface-row-hover",
          )}
        >
          <X className="size-5 text-rn-text-slate" aria-hidden />
        </Link>
      </header>

      <div className={cn("overflow-hidden", RN_CARD_SHELL)}>
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(onSubmit)();
          }}
        >
          <div className="flex flex-col gap-6 border-b-2 border-rn-border-strong bg-card px-6 py-6 sm:px-8 sm:py-7">
            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-unit`}>
                Enhet
              </Label>
              <FormSelectField
                name="unitId"
                control={form.control}
                id={`${rid}-unit`}
                className={cn(fieldClass, "font-medium")}
                disabled={activeUnits.length === 0}
                placeholder={
                  activeUnits.length === 0 ? "Ingen aktive enheter" : undefined
                }
                options={
                  activeUnits.length === 0
                    ? []
                    : activeUnits.map((u) => ({
                        value: u.id,
                        label: `${u.name} (maks ${u.maxGuests} gjester)`,
                      }))
                }
              />
              {form.formState.errors.unitId ? (
                <p className="text-app-sm text-destructive">
                  {form.formState.errors.unitId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-customer`}>
                Kunde
              </Label>
              <FormSelectField
                name="customerId"
                control={form.control}
                id={`${rid}-customer`}
                className={cn(fieldClass, "font-medium")}
                placeholder="— Registrer som ny kunde (fyll inn under) —"
                options={toIdNameOptions(customers)}
              />
              {form.formState.errors.customerId ? (
                <p className="text-app-sm text-destructive">
                  {form.formState.errors.customerId.message}
                </p>
              ) : null}
            </div>

            {showNewCustomer ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className={labelClass} htmlFor={`${rid}-nc-name`}>
                    Kundenavn <span className="font-bold text-destructive">*</span>
                  </Label>
                  <Input
                    id={`${rid}-nc-name`}
                    className={fieldClass}
                    {...form.register("newCustomerName")}
                  />
                  {form.formState.errors.newCustomerName ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.newCustomerName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-nc-phone`}>
                    Telefon <span className="font-bold text-destructive">*</span>
                  </Label>
                  <Input
                    id={`${rid}-nc-phone`}
                    className={fieldClass}
                    {...form.register("newCustomerPhone")}
                  />
                  {form.formState.errors.newCustomerPhone ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.newCustomerPhone.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-nc-email`}>
                    E-post
                  </Label>
                  <Input
                    id={`${rid}-nc-email`}
                    type="email"
                    className={fieldClass}
                    {...form.register("newCustomerEmail")}
                  />
                  {form.formState.errors.newCustomerEmail ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.newCustomerEmail.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className={labelClass} htmlFor={`${rid}-nc-addr`}>
                    Adresse
                  </Label>
                  <Input
                    id={`${rid}-nc-addr`}
                    className={fieldClass}
                    {...form.register("newCustomerAddress")}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-4 rounded-md border-2 border-rn-border-strong/45 bg-rn-surface-wash/25 p-4 sm:p-5">
              <div className="space-y-1.5">
                <p className={labelClass}>Tidspunkt</p>
                <p className="text-app-sm leading-snug text-muted-foreground">
                  Velg ankomst- og avreisedato. Du kan valgfritt legge inn klokkeslett for
                  innsjekk og utsjekk (vises i lister). Netter følger fortsatt datoene;
                  avreisedato er siste dag.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-checkin`}>
                    Ankomst
                  </Label>
                  <Controller
                    name="checkInDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePickerField
                        id={`${rid}-checkin`}
                        variant="toolbar"
                        className={cn(fieldClass, "shadow-sm")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        aria-invalid={!!form.formState.errors.checkInDate}
                      />
                    )}
                  />
                  {form.formState.errors.checkInDate ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkInDate.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-checkout`}>
                    Avreise
                  </Label>
                  <Controller
                    name="checkOutDate"
                    control={form.control}
                    render={({ field }) => (
                      <DatePickerField
                        id={`${rid}-checkout`}
                        variant="toolbar"
                        className={cn(fieldClass, "shadow-sm")}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        aria-invalid={!!form.formState.errors.checkOutDate}
                      />
                    )}
                  />
                  {form.formState.errors.checkOutDate ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkOutDate.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-checkin-t`}>
                    Kl. ankomst <span className="font-normal lowercase">(valgfritt)</span>
                  </Label>
                  <Input
                    id={`${rid}-checkin-t`}
                    type="time"
                    step={60}
                    className={fieldClass}
                    {...form.register("checkInTime")}
                  />
                  {form.formState.errors.checkInTime ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkInTime.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label className={labelClass} htmlFor={`${rid}-checkout-t`}>
                    Kl. avreise <span className="font-normal lowercase">(valgfritt)</span>
                  </Label>
                  <Input
                    id={`${rid}-checkout-t`}
                    type="time"
                    step={60}
                    className={fieldClass}
                    {...form.register("checkOutTime")}
                  />
                  {form.formState.errors.checkOutTime ? (
                    <p className="text-app-sm text-destructive">
                      {form.formState.errors.checkOutTime.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={labelClass} htmlFor={`${rid}-guests`}>
                  Antall gjester
                </Label>
                <Input
                  id={`${rid}-guests`}
                  type="number"
                  min={1}
                  className={fieldClass}
                  {...form.register("guestCount")}
                />
                {form.formState.errors.guestCount ? (
                  <p className="text-app-sm text-destructive">
                    {form.formState.errors.guestCount.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className={labelClass} htmlFor={`${rid}-status`}>
                  Status
                </Label>
                <FormSelectField
                  name="status"
                  control={form.control}
                  id={`${rid}-status`}
                  className={cn(fieldClass, "font-medium")}
                  options={toStringOptions(
                    ACCOMMODATION_RESERVATION_STATUSES,
                    (s) =>
                      ACCOMMODATION_RESERVATION_LABELS[
                        s as keyof typeof ACCOMMODATION_RESERVATION_LABELS
                      ],
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-price`}>
                Totalpris (valgfritt)
              </Label>
              <PriceInput
                id={`${rid}-price`}
                step="0.01"
                className={fieldClass}
                {...form.register("totalPrice")}
              />
              {form.formState.errors.totalPrice ? (
                <p className="text-app-sm text-destructive">
                  {form.formState.errors.totalPrice.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className={labelClass} htmlFor={`${rid}-notes`}>
                Notat
              </Label>
              <Textarea
                id={`${rid}-notes`}
                rows={3}
                className="rounded-md border-2 border-rn-border-strong bg-background p-3 focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
                {...form.register("notes")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 bg-muted/35 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
            <Link
              href="/app/overnatting"
              className={cn(
                buttonVariants({ variant: "outline", size: "cta" }),
                "inline-flex items-center justify-center border-2 border-rn-border-strong font-heading font-bold",
              )}
            >
              Avbryt
            </Link>
            <Button type="submit" variant="success" size="cta">
              Registrer reservasjon
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
