import type { FrozenContractDocument, FrozenLineItem } from "@/lib/contracts/types";

export const OVERRIDE_PATHS = [
  "issuer.legalName",
  "issuer.orgNumber",
  "issuer.addressLines",
  "issuer.phone",
  "issuer.email",
  "issuer.bankAccount",
  "customer.name",
  "customer.email",
  "customer.phone",
  "customer.address",
  "customer.companyName",
  "customer.companyOrgNumber",
  "customer.signerName",
  "customer.signerTitle",
  "booking.venueName",
  "booking.venueAddress",
  "booking.eventType",
  "booking.guestCount",
  "booking.eventStart",
  "booking.eventEnd",
  "booking.rentalStart",
  "booking.rentalEnd",
  "booking.lineItems",
  "terms.legalTerms",
  "terms.acceptanceDeclaration",
] as const;

export type OverridePath = (typeof OVERRIDE_PATHS)[number];
export type DocumentOverrides = Partial<Record<OverridePath, unknown>>;

const PATH_SET = new Set<string>(OVERRIDE_PATHS);

type Bag = Record<string, unknown>;

export function readPath(doc: FrozenContractDocument, path: OverridePath): unknown {
  const [group, key] = path.split(".") as [string, string];
  return (doc as unknown as Record<string, Bag>)[group]?.[key];
}

export function sanitizeOverrides(input: unknown): DocumentOverrides {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Bag = {};
  for (const [path, value] of Object.entries(input as Bag)) {
    if (PATH_SET.has(path)) out[path] = value;
  }
  return out as DocumentOverrides;
}

export function lineItemsTotalNok(lines: FrozenLineItem[]): number {
  return lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitAmountNok), 0);
}

export function applyOverrides(
  base: FrozenContractDocument,
  overrides: DocumentOverrides | null | undefined,
): FrozenContractDocument {
  const clean = sanitizeOverrides(overrides);
  const doc = structuredClone(base);
  for (const path of Object.keys(clean) as OverridePath[]) {
    const [group, key] = path.split(".") as [string, string];
    (doc as unknown as Record<string, Bag>)[group]![key] = clean[path];
  }
  if ("booking.lineItems" in clean && Array.isArray(clean["booking.lineItems"])) {
    doc.booking.totalNok = lineItemsTotalNok(doc.booking.lineItems);
  }
  return doc;
}

/** Keep only the fields where `edited` differs from the freshly composed `base`. */
export function diffOverrides(
  base: FrozenContractDocument,
  edited: FrozenContractDocument,
): DocumentOverrides {
  const out: Bag = {};
  for (const path of OVERRIDE_PATHS) {
    const a = readPath(base, path);
    const b = readPath(edited, path);
    if (JSON.stringify(a) !== JSON.stringify(b)) out[path] = b;
  }
  return out as DocumentOverrides;
}
