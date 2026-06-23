import { describe, expect, it } from "vitest";

import { estimateNewBookingTotalNok } from "@/lib/validations";

const packageCatalog = [
  { id: "pkg-wedding", price: 90_000 },
  { id: "pkg-basic", price: 8_500 },
];

const addonCatalog = [
  { id: "addon-dj", price: 5_000 },
  { id: "addon-cake", price: 2_500 },
];

describe("estimateNewBookingTotalNok", () => {
  it("sums catalog package and custom addon line", () => {
    expect(
      estimateNewBookingTotalNok(
        {
          packageSource: "catalog",
          selectedPackageId: "pkg-wedding",
          selectedAddonIds: [],
          customPackagePrice: 0,
          customAddonLines: [{ name: "Ekstra servering", priceNok: 5_000 }],
        },
        packageCatalog,
        addonCatalog,
      ),
    ).toBe(95_000);
  });

  it("sums catalog package, catalog addon, and custom line", () => {
    expect(
      estimateNewBookingTotalNok(
        {
          packageSource: "catalog",
          selectedPackageId: "pkg-wedding",
          selectedAddonIds: ["addon-dj"],
          customPackagePrice: 0,
          customAddonLines: [{ name: "Ekstra servering", priceNok: 5_000 }],
        },
        packageCatalog,
        addonCatalog,
      ),
    ).toBe(100_000);
  });

  it("sums custom package price and catalog addon", () => {
    expect(
      estimateNewBookingTotalNok(
        {
          packageSource: "custom",
          selectedPackageId: "",
          selectedAddonIds: ["addon-cake"],
          customPackagePrice: 12_000,
          customAddonLines: [],
        },
        packageCatalog,
        addonCatalog,
      ),
    ).toBe(14_500);
  });

  it("includes custom line price even without a name", () => {
    expect(
      estimateNewBookingTotalNok(
        {
          packageSource: "catalog",
          selectedPackageId: "pkg-basic",
          selectedAddonIds: [],
          customPackagePrice: 0,
          customAddonLines: [{ name: "   ", priceNok: 3_000 }],
        },
        packageCatalog,
        addonCatalog,
      ),
    ).toBe(11_500);
  });

  it("ignores empty custom lines", () => {
    expect(
      estimateNewBookingTotalNok(
        {
          packageSource: "catalog",
          selectedPackageId: "pkg-basic",
          selectedAddonIds: [],
          customPackagePrice: 0,
          customAddonLines: [{ name: "", priceNok: 0 }],
        },
        packageCatalog,
        addonCatalog,
      ),
    ).toBe(8_500);
  });
});
