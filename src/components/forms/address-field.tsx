"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import {
  applyOrganizationAddressRetrieve,
  applySimpleAddressRetrieve,
  type OrganizationAddressFieldNames,
} from "@/lib/mapbox/apply-address-retrieve";
import { getMapboxAccessToken, isMapboxConfigured } from "@/lib/mapbox/mapbox-env";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type {
  FieldPath,
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";

const AddressAutofill = dynamic(
  () =>
    import("@mapbox/search-js-react").then((mod) => mod.AddressAutofill),
  { ssr: false },
);

type AddressFieldBaseProps<T extends FieldValues> = {
  register: UseFormRegister<T>;
  setValue: UseFormSetValue<T>;
  id?: string;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  showHint?: boolean;
};

type SimpleAddressFieldProps<T extends FieldValues> = AddressFieldBaseProps<T> & {
  mode?: "simple";
  name: FieldPath<T>;
  format?: "single-line" | "multiline";
  variant?: "input" | "textarea";
};

type OrganizationAddressFieldProps<T extends FieldValues> =
  AddressFieldBaseProps<T> & {
    mode: "organization";
    organizationFields?: OrganizationAddressFieldNames<T>;
  };

export type AddressFieldProps<T extends FieldValues> =
  | SimpleAddressFieldProps<T>
  | OrganizationAddressFieldProps<T>;

function useAddressRetrieveHandler<T extends FieldValues>(
  props: AddressFieldProps<T>,
) {
  return (response: unknown) => {
    if (props.mode === "organization") {
      applyOrganizationAddressRetrieve(
        response,
        props.setValue,
        props.organizationFields,
      );
      return;
    }

    applySimpleAddressRetrieve(
      response,
      props.setValue,
      props.name,
      props.format ?? "single-line",
    );
  };
}

/**
 * Global address input with optional Mapbox autocomplete.
 * Use `mode="simple"` (default) for a single address string field.
 * Use `mode="organization"` to fill structured addressLine1/2, postalCode, and city.
 */
export function AddressField<T extends FieldValues>(props: AddressFieldProps<T>) {
  const { t } = useTranslation();
  const {
    register,
    id,
    className,
    placeholder = t("common.address.placeholder"),
    readOnly = false,
    disabled = false,
    "aria-invalid": ariaInvalid,
    showHint = true,
  } = props;

  const accessToken = useMemo(() => getMapboxAccessToken(), []);
  const handleRetrieve = useAddressRetrieveHandler(props);

  const isOrganization = props.mode === "organization";
  const fieldName = isOrganization
    ? (props.organizationFields?.addressLine1 ?? "addressLine1")
    : props.name;

  const registration = register(fieldName as FieldPath<T>);
  const useAutofill = Boolean(accessToken) && !readOnly && !disabled;
  const useTextarea =
    !isOrganization &&
    props.variant === "textarea" &&
    !useAutofill &&
    !readOnly &&
    !disabled;

  if (
    !isOrganization &&
    props.variant === "textarea" &&
    (readOnly || disabled)
  ) {
    return (
      <Textarea
        id={id}
        className={className}
        placeholder={placeholder}
        rows={3}
        readOnly={readOnly}
        disabled={disabled}
        autoComplete="street-address"
        aria-invalid={ariaInvalid}
        {...registration}
      />
    );
  }

  if (useTextarea) {
    return (
      <Textarea
        id={id}
        className={className}
        placeholder={placeholder}
        rows={3}
        autoComplete="street-address"
        aria-invalid={ariaInvalid}
        {...registration}
      />
    );
  }

  const input = (
    <Input
      id={id}
      className={className}
      placeholder={placeholder}
      autoComplete="address-line1"
      readOnly={readOnly}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      {...registration}
    />
  );

  return (
    <>
      {useAutofill ? (
        <AddressAutofill
          accessToken={accessToken!}
          options={{ country: "no", language: "nb" }}
          onRetrieve={handleRetrieve}
        >
          {input}
        </AddressAutofill>
      ) : (
        input
      )}
      {showHint && useAutofill ? (
        <p className="text-app-xs text-muted-foreground">
          {t("common.address.autofillHint")}
        </p>
      ) : showHint && !isMapboxConfigured() ? (
        <p className="text-app-xs text-muted-foreground">
          {t("common.address.manualHint")}
        </p>
      ) : null}
    </>
  );
}

/** @deprecated Use AddressField from `@/components/forms/address-field` */
export const MapboxAddressAutofillField = AddressField;
