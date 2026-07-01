"use client";

import { DatePickerField } from "@/components/ui/date-picker-field";
import { DateTimePickerField } from "@/components/ui/datetime-picker-field";
import { AddressField } from "@/components/forms/address-field";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import {
  FormSelectField,
  toIdNameOptions,
  toStringOptions,
} from "@/components/ui/form-select";
import { PropertySelectField } from "@/components/properties/property-select-field";
import { Textarea } from "@/components/ui/textarea";
import {
  BOOKING_INQUIRY_FORM_STATUSES,
  NEW_BOOKING_EVENT_TYPES,
} from "@/lib/validations";
import type { BookingInquiryFormInput } from "@/lib/validations";
import { INQUIRY_STATUS_LABELS } from "@/components/inquiries/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useId } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from "react-hook-form";

const fieldClass =
  "h-11 w-full rounded-md border-2 border-rn-border-strong bg-background px-3.5 text-sm text-foreground shadow-sm outline-none md:h-12 md:px-4 md:text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25";

const labelClass =
  "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:text-xs";

function FormSection({
  title,
  hint,
  children,
  variant = "card",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  variant?: "card" | "flat";
}) {
  if (variant === "flat") {
    return (
      <section className="space-y-4 border-t-2 border-rn-border-strong/40 pt-6 first:border-t-0 first:pt-0">
        <header className="space-y-1">
          <h3 className="font-heading text-base font-bold tracking-tight text-rn-text-heading md:text-lg">
            {title}
          </h3>
          {hint ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </header>
        <div className="space-y-4 md:space-y-5">{children}</div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border-2 border-rn-border-strong/45 bg-card/70 p-4 shadow-sm sm:p-5">
      <header className="space-y-1">
        <h3 className="font-heading text-base font-bold tracking-tight text-rn-text-heading md:text-lg">
          {title}
        </h3>
        {hint ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </header>
      <div className="space-y-4 md:space-y-5">{children}</div>
    </section>
  );
}

export type InquiryFormBodyProps = {
  register: UseFormRegister<BookingInquiryFormInput>;
  setValue: UseFormSetValue<BookingInquiryFormInput>;
  control: Control<BookingInquiryFormInput>;
  watch: UseFormWatch<BookingInquiryFormInput>;
  errors: FieldErrors<BookingInquiryFormInput>;
  properties: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  disabled?: boolean;
  /** Skjul kundevelger (eksisterende forespørsel med låst kunde) */
  lockCustomer?: boolean;
  /** Seksjonsinndeling og introtekst (f.eks. «Ny forespørsel»-dialog) */
  layout?: "default" | "sectioned";
};

export function InquiryFormBody({
  register,
  setValue,
  control,
  watch,
  errors,
  properties,
  customers,
  disabled = false,
  lockCustomer = false,
  layout = "default",
}: InquiryFormBodyProps) {
  const rid = useId().replace(/:/g, "");
  const customerId = watch("customerId");
  const showNewCustomer = !lockCustomer && !customerId;
  const sectioned = layout === "sectioned";

  const customerBlock = (
    <>
      {!lockCustomer ? (
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-customer`}>
            Eksisterende kunde
          </Label>
          <FormSelectField
            name="customerId"
            control={control}
            id={`${rid}-customer`}
            disabled={disabled}
            className="font-medium"
            placeholder="— Registrer som ny kunde (fyll inn under) —"
            options={toIdNameOptions(customers)}
          />
          {errors.customerId ? (
            <p className="text-sm text-destructive">{errors.customerId.message}</p>
          ) : null}
        </div>
      ) : null}

      {showNewCustomer ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className={labelClass} htmlFor={`${rid}-nc-name`}>
              Kundenavn <span className="font-bold text-destructive">*</span>
            </Label>
            <Input
              id={`${rid}-nc-name`}
              disabled={disabled}
              className={fieldClass}
              autoComplete="name"
              placeholder="Fullt navn eller firmanavn"
              {...register("newCustomerName")}
            />
            {errors.newCustomerName ? (
              <p className="text-sm text-destructive">
                {errors.newCustomerName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label className={labelClass} htmlFor={`${rid}-nc-phone`}>
              Telefon <span className="font-bold text-destructive">*</span>
            </Label>
            <Input
              id={`${rid}-nc-phone`}
              disabled={disabled}
              className={fieldClass}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+47 …"
              {...register("newCustomerPhone")}
            />
            {errors.newCustomerPhone ? (
              <p className="text-sm text-destructive">
                {errors.newCustomerPhone.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label className={labelClass} htmlFor={`${rid}-nc-email`}>
              E-post
            </Label>
            <Input
              id={`${rid}-nc-email`}
              disabled={disabled}
              type="email"
              className={fieldClass}
              autoComplete="email"
              placeholder="valgfritt@epost.no"
              {...register("newCustomerEmail")}
            />
            {errors.newCustomerEmail ? (
              <p className="text-sm text-destructive">
                {errors.newCustomerEmail.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className={labelClass} htmlFor={`${rid}-nc-addr`}>
              Adresse (valgfritt)
            </Label>
            <AddressField
              id={`${rid}-nc-addr`}
              name="newCustomerAddress"
              register={register}
              setValue={setValue}
              disabled={disabled}
              className={fieldClass}
              placeholder="Gate, postnr og sted"
            />
          </div>
        </div>
      ) : null}
    </>
  );

  const inquiryBlock = (
    <>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor={`${rid}-property`}>
          Lokale (valgfritt)
        </Label>
        <PropertySelectField
          name="propertyId"
          control={control}
          id={`${rid}-property`}
          disabled={disabled}
          optional
          placeholder="— Ikke valgt —"
          properties={properties}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-event-type`}>
            Bedrift eller privat
          </Label>
          <FormSelectField
            name="eventType"
            control={control}
            id={`${rid}-event-type`}
            disabled={disabled}
            className="font-medium"
            options={toStringOptions(NEW_BOOKING_EVENT_TYPES)}
          />
          {errors.eventType ? (
            <p className="text-sm text-destructive">{errors.eventType.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-fest`}>
            Type (valgfritt)
          </Label>
          <Input
            id={`${rid}-fest`}
            disabled={disabled}
            className={fieldClass}
            placeholder="F.eks. bryllup, konferanse, jubileum …"
            {...register("festType")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-date-start`}>
            Ønsket dato (valgfritt)
          </Label>
          <Controller
            control={control}
            name="preferredEventDate"
            render={({ field }) => (
              <DatePickerField
                id={`${rid}-date-start`}
                variant="toolbar"
                disabled={disabled}
                className={cn(fieldClass, "shadow-sm")}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
          {errors.preferredEventDate ? (
            <p className="text-sm text-destructive">
              {errors.preferredEventDate.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-date-end`}>
            Siste dag i ønsket periode (valgfritt)
          </Label>
          <Controller
            control={control}
            name="preferredEventEndDate"
            render={({ field }) => (
              <DatePickerField
                id={`${rid}-date-end`}
                variant="toolbar"
                disabled={disabled}
                className={cn(fieldClass, "shadow-sm")}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
          {errors.preferredEventEndDate ? (
            <p className="text-sm text-destructive">
              {errors.preferredEventEndDate.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-guests`}>
            Antall gjester (forslag)
          </Label>
          <Input
            id={`${rid}-guests`}
            type="number"
            min={0}
            disabled={disabled}
            className={cn(fieldClass, "tabular-nums")}
            {...register("guestCount", { valueAsNumber: false })}
          />
          {errors.guestCount ? (
            <p className="text-sm text-destructive">{errors.guestCount.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-est`}>
            Estimert budsjett (NOK, valgfritt)
          </Label>
          <PriceInput
            id={`${rid}-est`}
            step={100}
            disabled={disabled}
            className={cn(fieldClass)}
            placeholder="0"
            {...register("estimatedTotal")}
          />
          {errors.estimatedTotal ? (
            <p className="text-sm text-destructive">
              {errors.estimatedTotal.message}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  const followUpBlock = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-status`}>
            Status
          </Label>
          <FormSelectField
            name="status"
            control={control}
            id={`${rid}-status`}
            disabled={disabled}
            className="font-medium"
            options={BOOKING_INQUIRY_FORM_STATUSES.map((s) => ({
              value: s,
              label: INQUIRY_STATUS_LABELS[s],
            }))}
          />
          {errors.status ? (
            <p className="text-sm text-destructive">{errors.status.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor={`${rid}-followup`}>
            Neste oppfølging (valgfritt)
          </Label>
          <Controller
            control={control}
            name="nextFollowUpAt"
            render={({ field }) => (
              <DateTimePickerField
                id={`${rid}-followup`}
                variant="toolbar"
                disabled={disabled}
                className={cn(fieldClass, "shadow-sm")}
                value={field.value ?? ""}
                onChange={field.onChange}
                aria-invalid={Boolean(errors.nextFollowUpAt)}
              />
            )}
          />
          {errors.nextFollowUpAt ? (
            <p className="text-sm text-destructive">
              {errors.nextFollowUpAt.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={labelClass} htmlFor={`${rid}-notes`}>
          Interne merknader
        </Label>
        <Textarea
          id={`${rid}-notes`}
          disabled={disabled}
          rows={4}
          className="min-h-[6rem] rounded-md border-2 border-rn-border-strong bg-background p-3 text-base focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25 md:p-4"
          placeholder="Kort om behov, dialog med kunden, neste steg …"
          {...register("internalNotes")}
        />
        {errors.internalNotes ? (
          <p className="text-sm text-destructive">{errors.internalNotes.message}</p>
        ) : null}
      </div>
    </>
  );

  if (sectioned) {
    return (
      <div className="flex flex-col">
        <FormSection
          variant="flat"
          title="Kunde"
          hint="Velg en kunde fra listen, eller la den stå tom og fyll inn kontaktdetaljer for en ny kunde."
        >
          {customerBlock}
        </FormSection>
        <FormSection
          variant="flat"
          title="Henvendelse"
          hint="Dette er foreløpig informasjon — du justerer alt når du oppretter reservasjonen."
        >
          {inquiryBlock}
        </FormSection>
        <FormSection
          variant="flat"
          title="Oppfølging"
          hint="Ny forespørsel er vanligvis «Ny». Bruk påminnelse for å huske neste kontakt."
        >
          {followUpBlock}
        </FormSection>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {customerBlock}
      {inquiryBlock}
      {followUpBlock}
    </div>
  );
}
