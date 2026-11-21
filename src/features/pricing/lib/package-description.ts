const FEATURE_BULLET = /^[-•*–—]\s*/;

/**
 * Packs the tagline and the list of included points into the single `description` text the database stores:
 * the tagline on the first line, then one "– point" line per point. Empty points are dropped.
 * `parsePackageDescription` (src/lib/pricing) reads the same format back.
 */
export function buildPackageDescription(tagline: string, features: readonly string[]): string {
  return [
    tagline.trim(),
    ...features
      .map((f) => f.trim().replace(FEATURE_BULLET, "").trim())
      .filter(Boolean)
      .map((f) => `– ${f}`),
  ]
    .filter(Boolean)
    .join("\n");
}
