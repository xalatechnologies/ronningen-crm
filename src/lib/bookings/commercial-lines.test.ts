import { describe, expect, it } from "vitest";

import {
  buildBookingLineItems,
  packageAddonFormFromLines,
  parseInquiryCommercial,
} from "@/lib/bookings/commercial-lines";

const packages = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Extra Premium",
    description: "Alt i basis.",
    price: 55_000,
  },
];

const addons = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Lydanlegg",
    description: null,
    price: 3_000,
  },
];

describe("packageAddonFormFromLines", () => {
  it("maps catalog package, catalog addon and custom line", () => {
    const form = packageAddonFormFromLines(
      [
        {
          kind: "package",
          name: "Extra Premium Pakke",
          quantity: 1,
          unitAmountNok: 55_000,
          catalogId: packages[0]!.id,
        },
        {
          kind: "addon",
          name: "Lydanlegg",
          quantity: 1,
          unitAmountNok: 3_000,
          catalogId: addons[0]!.id,
        },
        {
          kind: "custom",
          name: "Ekstra bar",
          quantity: 1,
          unitAmountNok: 5_000,
          catalogId: null,
        },
        {
          kind: "adjustment",
          name: "Avtalt justering",
          quantity: 1,
          unitAmountNok: 17_000,
          catalogId: null,
        },
      ],
      packages,
      addons,
    );

    expect(form.packageSource).toBe("catalog");
    expect(form.selectedPackageId).toBe(packages[0]!.id);
    expect(form.selectedAddonIds).toEqual([addons[0]!.id]);
    expect(form.customAddonLines).toEqual([
      { name: "Ekstra bar", priceNok: 5_000 },
    ]);
  });
});

describe("parseInquiryCommercial", () => {
  it("keeps catalog selection and custom add-ons", () => {
    const form = parseInquiryCommercial({
      packageSource: "catalog",
      selectedPackageId: packages[0]!.id,
      customPackageName: "",
      customPackagePrice: 0,
      selectedAddonIds: [addons[0]!.id],
      customAddonLines: [{ name: "Bar", priceNok: 5_000 }],
    });
    expect(form.selectedPackageId).toBe(packages[0]!.id);
    expect(form.selectedAddonIds).toEqual([addons[0]!.id]);
    expect(form.customAddonLines).toEqual([{ name: "Bar", priceNok: 5_000 }]);
  });
});

describe("buildBookingLineItems", () => {
  it("rebuilds package, addon, custom and adjustment", () => {
    const lines = buildBookingLineItems({
      form: {
        packageSource: "catalog",
        selectedPackageId: packages[0]!.id,
        customPackageName: "",
        customPackagePrice: 0,
        selectedAddonIds: [addons[0]!.id],
        customAddonLines: [{ name: "Ekstra bar", priceNok: 5_000 }],
      },
      packages,
      addons,
      agreedTotal: 80_000,
      defaultPackageName: "Pakke",
    });

    expect(lines.map((line) => line.kind)).toEqual([
      "package",
      "addon",
      "custom",
      "adjustment",
    ]);
    expect(lines.at(-1)?.unit_amount_nok).toBe(17_000);
  });
});
