import { describe, expect, it } from "vitest";

import {
  mapAddressFeatureToOrganizationFields,
  mapAddressRetrieveResponseToFormattedAddress,
  mapAddressRetrieveResponseToOrganizationFields,
} from "@/lib/mapbox/map-address-feature";

describe("mapAddressFeatureToOrganizationFields", () => {
  it("maps Norwegian address properties", () => {
    const mapped = mapAddressFeatureToOrganizationFields({
      properties: {
        address_line1: "Kongens gate 1",
        address_line2: "c/o Example",
        postcode: "7011",
        place: "Trondheim",
      },
    });

    expect(mapped).toEqual({
      addressLine1: "Kongens gate 1",
      addressLine2: "c/o Example",
      postalCode: "7011",
      city: "Trondheim",
    });
  });

  it("falls back to full_address and locality", () => {
    const mapped = mapAddressFeatureToOrganizationFields({
      properties: {
        full_address: "Storgata 10, 0182 Oslo",
        locality: "Oslo",
        postcode: "0182",
      },
    });

    expect(mapped).toEqual({
      addressLine1: "Storgata 10, 0182 Oslo",
      addressLine2: "",
      postalCode: "0182",
      city: "Oslo",
    });
  });

  it("returns null when no street line is available", () => {
    expect(
      mapAddressFeatureToOrganizationFields({ properties: { postcode: "7011" } }),
    ).toBeNull();
  });
});

describe("mapAddressRetrieveResponseToOrganizationFields", () => {
  it("reads the first feature from a retrieve response", () => {
    const mapped = mapAddressRetrieveResponseToOrganizationFields({
      features: [
        {
          properties: {
            address_line1: "Dronning Eufemias gate 16",
            postcode: "0191",
            place: "Oslo",
          },
        },
      ],
    });

    expect(mapped?.addressLine1).toBe("Dronning Eufemias gate 16");
    expect(mapped?.postalCode).toBe("0191");
    expect(mapped?.city).toBe("Oslo");
  });
});

describe("mapAddressRetrieveResponseToFormattedAddress", () => {
  const response = {
    features: [
      {
        properties: {
          address_line1: "Kongens gate 1",
          address_line2: "c/o Example",
          postcode: "7011",
          place: "Trondheim",
        },
      },
    ],
  };

  it("formats a single-line address", () => {
    expect(
      mapAddressRetrieveResponseToFormattedAddress(response, "single-line"),
    ).toBe("Kongens gate 1, c/o Example, 7011 Trondheim");
  });

  it("formats a multiline address", () => {
    expect(
      mapAddressRetrieveResponseToFormattedAddress(response, "multiline"),
    ).toBe("Kongens gate 1\nc/o Example\n7011 Trondheim");
  });
});
