import { describe, expect, it, vi } from "vitest";

import {
  applyOrganizationAddressRetrieve,
  applySimpleAddressRetrieve,
} from "@/lib/mapbox/apply-address-retrieve";

describe("applySimpleAddressRetrieve", () => {
  it("writes a formatted address to the target field", () => {
    const setValue = vi.fn();
    const response = {
      features: [
        {
          properties: {
            address_line1: "Kongens gate 1",
            postcode: "7011",
            place: "Trondheim",
          },
        },
      ],
    };

    expect(
      applySimpleAddressRetrieve(response, setValue, "address", "single-line"),
    ).toBe(true);

    expect(setValue).toHaveBeenCalledWith(
      "address",
      "Kongens gate 1, 7011 Trondheim",
      { shouldDirty: true, shouldValidate: true },
    );
  });
});

describe("applyOrganizationAddressRetrieve", () => {
  it("writes structured organization fields", () => {
    const setValue = vi.fn();
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

    expect(applyOrganizationAddressRetrieve(response, setValue)).toBe(true);

    expect(setValue).toHaveBeenCalledWith(
      "addressLine1",
      "Kongens gate 1",
      { shouldDirty: true, shouldValidate: true },
    );
    expect(setValue).toHaveBeenCalledWith(
      "postalCode",
      "7011",
      { shouldDirty: true, shouldValidate: true },
    );
    expect(setValue).toHaveBeenCalledWith(
      "city",
      "Trondheim",
      { shouldDirty: true, shouldValidate: true },
    );
  });
});
