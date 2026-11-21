import type { AssetListItem } from "@/features/assets/types";
import {
  assetRowInsuranceIsCovered,
  assetStatusBucket,
  type AssetStatusBucket,
} from "@/lib/asset-status-bucket";

export type AssetsInventoryStats = {
  totalValue: number;
  totalUnits: number;
  rowCount: number;
  counts: { operational: number; maintenance: number; replace: number };
  insuredValue: number;
  uninsuredValue: number;
};

/** Totals and counts for the whole inventory (not the filtered list). */
export function computeAssetsStats(assets: readonly AssetListItem[]): AssetsInventoryStats {
  let totalValue = 0;
  let totalUnits = 0;
  let insuredValue = 0;
  let uninsuredValue = 0;
  const counts = { operational: 0, maintenance: 0, replace: 0 };
  for (const a of assets) {
    const v = Number(a.value);
    const q = Number(a.quantity);
    totalValue += v;
    totalUnits += q;
    counts[assetStatusBucket(a.condition)] += 1;
    if (assetRowInsuranceIsCovered(a.insurance_status)) {
      insuredValue += v;
    } else {
      uninsuredValue += v;
    }
  }
  return { totalValue, totalUnits, counts, insuredValue, uninsuredValue, rowCount: assets.length };
}

/** Venue, condition bucket and free-text search, all optional. */
export function filterAssets(
  assets: readonly AssetListItem[],
  { propertyId, statusFilter, query }: { propertyId: string; statusFilter: "all" | AssetStatusBucket; query: string },
): AssetListItem[] {
  const q = query.trim().toLowerCase();
  return assets.filter((a) => {
    if (propertyId && a.property_id !== propertyId) return false;
    if (statusFilter !== "all" && assetStatusBucket(a.condition) !== statusFilter) return false;
    if (q) {
      const hay = `${a.name} ${a.propertyName ?? ""} ${a.condition ?? ""} ${a.insurance_status ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
