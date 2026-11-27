import { describe, expect, it } from "vitest";

import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_KEYS, legalDocument } from "@/features/legal/lib/legal-documents";

describe("legal documents", () => {
  it("lists terms, privacy and the data processing agreement, each with a public path and a version", () => {
    expect(LEGAL_DOCUMENT_KEYS).toEqual(["terms", "privacy", "dpa"]);
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.path.startsWith("/")).toBe(true);
      expect(doc.version.length).toBeGreaterThan(0);
    }
  });

  it("has final versions, not draft ones", () => {
    for (const doc of LEGAL_DOCUMENTS) expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("finds a document by key", () => {
    expect(legalDocument("dpa").path).toBe("/databehandleravtale");
  });
});
