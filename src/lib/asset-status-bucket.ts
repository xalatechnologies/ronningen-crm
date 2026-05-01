export type AssetStatusBucket = "operational" | "maintenance" | "replace";

/** Same buckets as Aktiva — brukes i rapporter og liste. */
export function assetStatusBucket(condition: string | null): AssetStatusBucket {
  const c = (condition ?? "").toLowerCase();
  if (
    c.includes("utmerket") ||
    c.includes("excellent") ||
    c.includes("god") ||
    c.includes("good") ||
    c.includes("ny") ||
    !c
  ) {
    return "operational";
  }
  if (
    c.includes("fair") ||
    c.includes("akseptabel") ||
    c.includes("middels") ||
    c.includes("vedlikehold") ||
    c.includes("maintenance")
  ) {
    return "maintenance";
  }
  if (
    c.includes("dårlig") ||
    c.includes("poor") ||
    c.includes("bytt") ||
    c.includes("replace") ||
    c.includes("avvik")
  ) {
    return "replace";
  }
  return "maintenance";
}

export type AssetInsuranceBucket =
  | "covered"
  | "excluded"
  | "unknown"
  | "other";

function normalizeInsuranceRaw(status: string | null | undefined): string {
  return (status ?? "").replaceAll("\u00a0", " ").trim();
}

/**
 * Én felles tolkning for liste, summering og rapporter.
 * Viktig: «ikke forsikret» må sjekkes før ordet «forsikret» (substring-felle).
 */
export function assetInsuranceBucket(
  status: string | null | undefined,
): AssetInsuranceBucket {
  const raw = normalizeInsuranceRaw(status);
  if (!raw) return "unknown";

  const s = raw.toLowerCase();
  if (s === "ukjent") return "unknown";

  if (
    s === "ikke forsikret" ||
    /\bikke\s+forsikret\b/i.test(raw) ||
    s.includes("not insured") ||
    s.includes("uninsured") ||
    s === "nei" ||
    s === "no"
  ) {
    return "excluded";
  }

  if (
    s === "forsikret" ||
    s === "ja" ||
    s === "yes" ||
    /\bforsikret\b/i.test(raw) ||
    (s.includes("insured") &&
      !s.includes("not insured") &&
      !s.includes("uninsured"))
  ) {
    return "covered";
  }

  return "other";
}

/** Forsikret verdi / linjer — samme kriterium som «Forsikret»-kolonnen i Aktiva. */
export function assetRowInsuranceIsCovered(status: string | null): boolean {
  return assetInsuranceBucket(status) === "covered";
}
