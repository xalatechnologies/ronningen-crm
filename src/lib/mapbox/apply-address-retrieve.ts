import {
  mapAddressRetrieveResponseToFormattedAddress,
  mapAddressRetrieveResponseToOrganizationFields,
  type MappedOrganizationAddress,
} from "@/lib/mapbox/map-address-feature";
import type { FieldPath, FieldValues, UseFormSetValue } from "react-hook-form";

const setOpts = { shouldDirty: true, shouldValidate: true } as const;

export type OrganizationAddressFieldNames<T extends FieldValues> = {
  addressLine1: FieldPath<T>;
  addressLine2: FieldPath<T>;
  postalCode: FieldPath<T>;
  city: FieldPath<T>;
};

export const DEFAULT_ORGANIZATION_ADDRESS_FIELDS = {
  addressLine1: "addressLine1",
  addressLine2: "addressLine2",
  postalCode: "postalCode",
  city: "city",
} as const;

/** Apply a Mapbox retrieve response to a single free-text address field. */
export function applySimpleAddressRetrieve<T extends FieldValues>(
  response: unknown,
  setValue: UseFormSetValue<T>,
  name: FieldPath<T>,
  format: "single-line" | "multiline" = "single-line",
): boolean {
  const formatted = mapAddressRetrieveResponseToFormattedAddress(response, format);
  if (!formatted) return false;

  setValue(name, formatted as T[FieldPath<T>], setOpts);
  return true;
}

/** Apply a Mapbox retrieve response to structured organization address fields. */
export function applyOrganizationAddressRetrieve<T extends FieldValues>(
  response: unknown,
  setValue: UseFormSetValue<T>,
  fields: OrganizationAddressFieldNames<T> = DEFAULT_ORGANIZATION_ADDRESS_FIELDS as OrganizationAddressFieldNames<T>,
): boolean {
  const mapped = mapAddressRetrieveResponseToOrganizationFields(response);
  if (!mapped) return false;

  applyMappedOrganizationAddress(setValue, fields, mapped);
  return true;
}

export function applyMappedOrganizationAddress<T extends FieldValues>(
  setValue: UseFormSetValue<T>,
  fields: OrganizationAddressFieldNames<T>,
  mapped: MappedOrganizationAddress,
): void {
  setValue(fields.addressLine1, mapped.addressLine1 as T[FieldPath<T>], setOpts);
  setValue(fields.addressLine2, mapped.addressLine2 as T[FieldPath<T>], setOpts);
  setValue(fields.postalCode, mapped.postalCode as T[FieldPath<T>], setOpts);
  setValue(fields.city, mapped.city as T[FieldPath<T>], setOpts);
}
