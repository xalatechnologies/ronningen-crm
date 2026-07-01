export type MappedOrganizationAddress = {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
};

type MapboxAddressProperties = {
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  full_address?: string;
  name?: string;
  place?: string;
  locality?: string;
  postcode?: string;
  region?: string;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readAddressProperties(
  feature: unknown,
): MapboxAddressProperties | null {
  if (feature == null || typeof feature !== "object") return null;
  const properties = (feature as { properties?: unknown }).properties;
  if (properties == null || typeof properties !== "object") return null;
  return properties as MapboxAddressProperties;
}

/** Map a Mapbox Address Autofill retrieve feature to organization form fields. */
export function mapAddressFeatureToOrganizationFields(
  feature: unknown,
): MappedOrganizationAddress | null {
  const properties = readAddressProperties(feature);
  if (!properties) return null;

  const addressLine1 =
    readString(properties.address_line1) ||
    readString(properties.full_address) ||
    readString(properties.name);

  if (!addressLine1) return null;

  const addressLine2 =
    readString(properties.address_line2) ||
    readString(properties.address_line3);

  const postalCode = readString(properties.postcode);
  const city =
    readString(properties.place) ||
    readString(properties.locality) ||
    readString(properties.region);

  return {
    addressLine1,
    addressLine2,
    postalCode,
    city,
  };
}

export function mapAddressRetrieveResponseToOrganizationFields(
  response: unknown,
): MappedOrganizationAddress | null {
  if (response == null || typeof response !== "object") return null;

  const features = (response as { features?: unknown }).features;
  if (!Array.isArray(features) || features.length === 0) return null;

  return mapAddressFeatureToOrganizationFields(features[0]);
}
