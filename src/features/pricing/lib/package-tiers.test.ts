import { describe, expect, it } from "vitest";

import { packageTierSortKey, pickPopularPackageId, sortPackages } from "@/features/pricing/lib/package-tiers";

const pkg = (id: string, name: string) => ({ id, name });

describe("packageTierSortKey", () => {
  it("ranks tier words and puts unknown names last", () => {
    expect(packageTierSortKey("Basis Pakke")).toBeLessThan(packageTierSortKey("Plus"));
    expect(packageTierSortKey("Premium Pakke")).toBeLessThan(packageTierSortKey("Luksus"));
    expect(packageTierSortKey("Bursdag - Høy sesong")).toBe(100);
  });
});

describe("sortPackages", () => {
  it("sorts by tier, then alphabetically, without changing the input", () => {
    const input = [pkg("1", "Rabattert"), pkg("2", "Premium Pakke"), pkg("3", "Basis Pakke"), pkg("4", "Bursdag")];
    const sorted = sortPackages(input, "nb");
    expect(sorted.map((p) => p.id)).toEqual(["3", "2", "4", "1"]);
    expect(input.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("pickPopularPackageId", () => {
  it("prefers the package named plus", () => {
    expect(pickPopularPackageId([pkg("a", "Basis"), pkg("b", "Plus"), pkg("c", "Premium")])).toBe("b");
  });

  it("otherwise takes the second package, or the only one, or nothing", () => {
    expect(pickPopularPackageId([pkg("a", "Basis"), pkg("b", "Premium")])).toBe("b");
    expect(pickPopularPackageId([pkg("a", "Basis")])).toBe("a");
    expect(pickPopularPackageId([])).toBeNull();
  });
});
