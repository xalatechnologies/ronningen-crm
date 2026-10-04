import { describe, expect, it } from "vitest";

import {
  buildBookingLineItems,
  packageAddonFormFromLines,
  parseInquiryCommercial,
  serializeCustomPackageFeatures,
  uniqueCatalogPackageFeatures,
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
    expect(form.customPackageFeatures).toEqual([]);
  });

  it("reads custom package inclusion bullets from the stored description", () => {
    const form = packageAddonFormFromLines(
      [
        {
          kind: "package",
          name: "Helgepakke",
          quantity: 1,
          unitAmountNok: 40_000,
          catalogId: null,
          description: "- Lokale med bord og stoler\n- Sluttrenhold",
        },
      ],
      packages,
      addons,
    );
    expect(form.packageSource).toBe("custom");
    expect(form.customPackageName).toBe("Helgepakke");
    expect(form.customPackageFeatures).toEqual([
      "Lokale med bord og stoler",
      "Sluttrenhold",
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
      customPackageFeatures: ["Lokale med bord og stoler"],
      selectedAddonIds: [addons[0]!.id],
      customAddonLines: [{ name: "Bar", priceNok: 5_000 }],
    });
    expect(form.selectedPackageId).toBe(packages[0]!.id);
    expect(form.selectedAddonIds).toEqual([addons[0]!.id]);
    expect(form.customAddonLines).toEqual([{ name: "Bar", priceNok: 5_000 }]);
    expect(form.customPackageFeatures).toEqual(["Lokale med bord og stoler"]);
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
        customPackageFeatures: [],
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

  it("stores custom package inclusions on the package line description", () => {
    const lines = buildBookingLineItems({
      form: {
        packageSource: "custom",
        selectedPackageId: "",
        customPackageName: "Helgepakke",
        customPackagePrice: 40_000,
        customPackageFeatures: ["Lokale med bord og stoler", "Sluttrenhold"],
        selectedAddonIds: [],
        customAddonLines: [],
      },
      packages,
      addons,
      agreedTotal: 40_000,
      defaultPackageName: "Pakke",
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.description).toBe(
      serializeCustomPackageFeatures([
        "Lokale med bord og stoler",
        "Sluttrenhold",
      ]),
    );
    expect(
      packageAddonFormFromLines(
        [
          {
            kind: lines[0]!.kind,
            name: lines[0]!.name,
            quantity: lines[0]!.quantity,
            unitAmountNok: lines[0]!.unit_amount_nok,
            catalogId: lines[0]!.catalog_id,
            description: lines[0]!.description,
          },
        ],
        packages,
        addons,
      ).customPackageFeatures,
    ).toEqual(["Lokale med bord og stoler", "Sluttrenhold"]);
  });
});

describe("uniqueCatalogPackageFeatures", () => {
  it("dedupes bullets from catalog package descriptions", () => {
    expect(
      uniqueCatalogPackageFeatures([
        { description: "Alt i basis.\n- Lokale med bord og stoler" },
        { description: "- Lokale med bord og stoler\n- Sluttrenhold" },
      ]),
    ).toEqual(["Alt i basis.", "Lokale med bord og stoler", "Sluttrenhold"]);
  });
});
