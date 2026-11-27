/**
 * The agreements a new account must accept. `version` is bumped whenever the text changes in a way that needs
 * a new acceptance; it is saved with every acceptance so we can show later exactly what was agreed to.
 */
export const LEGAL_DOCUMENTS = [
  { key: "terms", path: "/vilkar", version: "2026-11-27" },
  { key: "privacy", path: "/personvern", version: "2026-11-27" },
  { key: "dpa", path: "/databehandleravtale", version: "2026-11-27" },
] as const;

export type LegalDocumentKey = (typeof LEGAL_DOCUMENTS)[number]["key"];

export const LEGAL_DOCUMENT_KEYS = LEGAL_DOCUMENTS.map((d) => d.key) as [LegalDocumentKey, ...LegalDocumentKey[]];

export function legalDocument(key: LegalDocumentKey) {
  return LEGAL_DOCUMENTS.find((d) => d.key === key)!;
}

/** The company behind the service, used in the legal texts. Org number checked against Brønnøysundregistrene. */
export const LEGAL_COMPANY = {
  name: "Xala Technologies AS",
  orgNumber: "920 972 454",
  city: "Asker",
  website: "xala.no",
} as const;
