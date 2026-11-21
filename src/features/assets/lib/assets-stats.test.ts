import { describe, expect, it } from "vitest";

import { computeAssetsStats, filterAssets } from "@/features/assets/lib/assets-stats";
import type { AssetListItem } from "@/features/assets/types";

const asset = (over: Partial<AssetListItem>): AssetListItem => ({
  id: "a",
  property_id: "p1",
  propertyName: "Gården",
  name: "Stol",
  quantity: 10,
  value: 1000,
  condition: "God",
  insurance_status: "Forsikret",
  ...over,
});

const assets = [
  asset({ id: "1", name: "Stol", quantity: 10, value: 1000, condition: "God", insurance_status: "Forsikret" }),
  asset({ id: "2", name: "Bord", quantity: 4, value: 3000, condition: "Akseptabel", insurance_status: "Ikke forsikret", property_id: "p2", propertyName: "Hallen" }),
  asset({ id: "3", name: "Lyd", quantity: 1, value: 500, condition: "Dårlig — byttes", insurance_status: "Ukjent" }),
];

describe("computeAssetsStats", () => {
  it("sums value and units and counts each condition bucket", () => {
    const stats = computeAssetsStats(assets);
    expect(stats.rowCount).toBe(3);
    expect(stats.totalValue).toBe(4500);
    expect(stats.totalUnits).toBe(15);
    expect(stats.counts).toEqual({ operational: 1, maintenance: 1, replace: 1 });
  });

  it("splits insured and uninsured value", () => {
    const stats = computeAssetsStats(assets);
    expect(stats.insuredValue).toBe(1000);
    expect(stats.uninsuredValue).toBe(3500);
  });

  it("handles an empty inventory", () => {
    expect(computeAssetsStats([])).toEqual({
      totalValue: 0,
      totalUnits: 0,
      counts: { operational: 0, maintenance: 0, replace: 0 },
      insuredValue: 0,
      uninsuredValue: 0,
      rowCount: 0,
    });
  });
});

describe("filterAssets", () => {
  const none = { propertyId: "", statusFilter: "all" as const, query: "" };

  it("returns everything without filters", () => {
    expect(filterAssets(assets, none)).toHaveLength(3);
  });

  it("filters by venue", () => {
    expect(filterAssets(assets, { ...none, propertyId: "p2" }).map((a) => a.id)).toEqual(["2"]);
  });

  it("filters by condition bucket", () => {
    expect(filterAssets(assets, { ...none, statusFilter: "replace" }).map((a) => a.id)).toEqual(["3"]);
    expect(filterAssets(assets, { ...none, statusFilter: "operational" }).map((a) => a.id)).toEqual(["1"]);
  });

  it("searches name, venue, condition and insurance, ignoring case and spaces around the query", () => {
    expect(filterAssets(assets, { ...none, query: "  BORD " }).map((a) => a.id)).toEqual(["2"]);
    expect(filterAssets(assets, { ...none, query: "hallen" }).map((a) => a.id)).toEqual(["2"]);
    expect(filterAssets(assets, { ...none, query: "ukjent" }).map((a) => a.id)).toEqual(["3"]);
  });

  it("combines filters", () => {
    expect(filterAssets(assets, { propertyId: "p1", statusFilter: "operational", query: "stol" })).toHaveLength(1);
    expect(filterAssets(assets, { propertyId: "p2", statusFilter: "operational", query: "" })).toHaveLength(0);
  });
});
