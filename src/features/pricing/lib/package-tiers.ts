import type { PackageRow } from "@/features/pricing/types";

/** Names containing these words sort in this order (cheapest tier first); everything else goes last. */
export const PACKAGE_TIER_ORDER = [
  "basis",
  "plus",
  "premium",
  "luksus",
  "luxury",
] as const;

export function packageTierSortKey(name: string): number {
  const n = name.toLowerCase();
  for (let i = 0; i < PACKAGE_TIER_ORDER.length; i++) {
    if (n.includes(PACKAGE_TIER_ORDER[i])) return i;
  }
  return 100;
}


/** Tier order first, then alphabetical in the user's locale. */
export function sortPackages<T extends Pick<PackageRow, "name">>(packages: readonly T[], locale: string): T[] {
  return [...packages].sort((a, b) => {
    const da = packageTierSortKey(a.name);
    const db = packageTierSortKey(b.name);
    if (da !== db) return da - db;
    return a.name.localeCompare(b.name, locale);
  });
}

/** The package shown as "most popular": the one named "plus", else the second, else the first. */
export function pickPopularPackageId<T extends Pick<PackageRow, "id" | "name">>(sorted: readonly T[]): string | null {
  const plus = sorted.find((p) => p.name.toLowerCase().includes("plus"));
  if (plus) return plus.id;
  if (sorted.length >= 2) return sorted[1]!.id;
  return sorted[0]?.id ?? null;
}
