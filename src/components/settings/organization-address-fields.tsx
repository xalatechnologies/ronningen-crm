"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapAddressRetrieveResponseToOrganizationFields } from "@/lib/mapbox/map-address-feature";
import { getMapboxAccessToken } from "@/lib/mapbox/mapbox-env";
import type { OrganizationProfileFormInput } from "@/lib/validations";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";

const AddressAutofill = dynamic(
  () =>
    import("@mapbox/search-js-react").then((mod) => mod.AddressAutofill),
  { ssr: false },
);

type OrganizationAddressFieldsProps = {
  register: UseFormRegister<OrganizationProfileFormInput>;
  setValue: UseFormSetValue<OrganizationProfileFormInput>;
  errors: FieldErrors<OrganizationProfileFormInput>;
  labelClass: string;
  fieldClass: string;
};

function AddressLine1Input({
  register,
  fieldClass,
  onRetrieve,
  accessToken,
}: {
  register: UseFormRegister<OrganizationProfileFormInput>;
  fieldClass: string;
  accessToken: string | null;
  onRetrieve: (response: unknown) => void;
}) {
  const input = (
    <Input
      id="org-addr1"
      className={fieldClass}
      autoComplete="address-line1"
      {...register("addressLine1")}
    />
  );

  if (!accessToken) return input;

  return (
    <AddressAutofill
      accessToken={accessToken}
      options={{ country: "no", language: "nb" }}
      onRetrieve={onRetrieve}
    >
      {input}
    </AddressAutofill>
  );
}

export function OrganizationAddressFields({
  register,
  setValue,
  errors,
  labelClass,
  fieldClass,
}: OrganizationAddressFieldsProps) {
  const accessToken = useMemo(() => getMapboxAccessToken(), []);

  function handleRetrieve(response: unknown) {
    const mapped = mapAddressRetrieveResponseToOrganizationFields(response);
    if (!mapped) return;

    setValue("addressLine1", mapped.addressLine1, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("addressLine2", mapped.addressLine2, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("postalCode", mapped.postalCode, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("city", mapped.city, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor="org-addr1">
          Adresse
        </Label>
        <AddressLine1Input
          register={register}
          fieldClass={fieldClass}
          accessToken={accessToken}
          onRetrieve={handleRetrieve}
        />
        <p className="text-app-xs text-muted-foreground">
          {accessToken
            ? "Begynn å skrive for forslag, eller fyll inn manuelt."
            : "Fyll inn adressen manuelt."}
        </p>
      </div>
      <div className="space-y-2">
        <Label className={labelClass} htmlFor="org-addr2">
          Adresselinje 2
        </Label>
        <Input
          id="org-addr2"
          className={fieldClass}
          placeholder="Valgfritt"
          autoComplete="address-line2"
          {...register("addressLine2")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-postal">
            Postnummer
          </Label>
          <Input
            id="org-postal"
            className={fieldClass}
            autoComplete="postal-code"
            {...register("postalCode")}
          />
          {errors.postalCode ? (
            <p className="text-sm text-destructive">
              {errors.postalCode.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label className={labelClass} htmlFor="org-city">
            Poststed
          </Label>
          <Input
            id="org-city"
            className={fieldClass}
            autoComplete="address-level2"
            {...register("city")}
          />
          {errors.city ? (
            <p className="text-sm text-destructive">{errors.city.message}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
