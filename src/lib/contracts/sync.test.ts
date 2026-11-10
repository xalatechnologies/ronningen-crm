import { describe, expect, it } from "vitest";

import { composeFrozenDocument } from "@/lib/contracts/compose";
import { contractOutOfSync, syncOutcomeForStatus } from "@/lib/contracts/sync";
import type { FrozenContractDocument } from "@/lib/contracts/types";

function doc(patch: Partial<FrozenContractDocument["booking"]> = {}): FrozenContractDocument {
  return composeFrozenDocument({
    agreementId: "a",
    contractId: "c",
    versionId: "v",
    versionNumber: 1,
    language: "nb",
    declarationVersion: "v1",
    replacesVersionId: null,
    previousVersionNumber: null,
    previousAccepted: false,
    issuer: {
      legalName: "Rønningen AS",
      orgNumber: "1",
      addressLines: [],
      city: null,
      phone: null,
      email: null,
      bankAccount: null,
      tagline: null,
      paymentInstructions: null,
    },
    customer: {
      name: "Kari",
      email: null,
      phone: null,
      address: null,
      companyName: null,
      companyOrgNumber: null,
      signerName: "Kari",
      signerTitle: null,
    },
    booking: {
      reservationId: "b",
      reference: "R1",
      venueName: "Salen",
      venueAddress: null,
      eventType: "Bryllup",
      festType: "bryllup",
      guestCount: 50,
      eventStart: "2026-06-01",
      eventEnd: null,
      rentalStart: null,
      rentalEnd: null,
      timezone: "Europe/Oslo",
      kitchenAccess: "included",
      totalNok: 1000,
      lineItems: [
        { kind: "package", name: "Pakke", quantity: 1, unitAmountNok: 1000, description: "a" },
      ],
      installments: [],
      customerFacingNotes: null,
      ...patch,
    },
    issuedAt: "2026-01-01T00:00:00Z",
    terms: {
      templateVersionId: null,
      legalTerms: "x",
      paymentTerms: "y",
      specialTerms: "",
      selectedClauses: [],
      acceptanceDeclaration: "z",
      closingLine: null,
      signerName: null,
      signaturePath: null,
    },
  });
}

describe("contract sync", () => {
  it("treats an identical document (even after a JSON round trip) as in sync", () => {
    const a = doc();
    expect(contractOutOfSync(a, JSON.parse(JSON.stringify(a)))).toBe(false);
  });

  it("detects guest count, price and installment changes", () => {
    expect(contractOutOfSync(doc(), doc({ guestCount: 60 }))).toBe(true);
    expect(contractOutOfSync(doc(), doc({ totalNok: 1200 }))).toBe(true);
    expect(
      contractOutOfSync(
        doc(),
        doc({ installments: [{ label: "Depositum", amountNok: 500, dueDate: null }] }),
      ),
    ).toBe(true);
  });

  it("ignores catalog description and issuer-only changes", () => {
    const changed = doc({
      lineItems: [
        { kind: "package", name: "Pakke", quantity: 1, unitAmountNok: 1000, description: "b" },
      ],
    });
    changed.issuer.legalName = "Annet AS";
    expect(contractOutOfSync(doc(), changed)).toBe(false);
  });

  it("maps latest status to the next step", () => {
    expect(syncOutcomeForStatus("draft")).toBe("draft_is_live");
    expect(syncOutcomeForStatus("sent")).toBe("compare");
    expect(syncOutcomeForStatus("viewed")).toBe("compare");
    expect(syncOutcomeForStatus("accepted")).toBe("compare");
    expect(syncOutcomeForStatus("withdrawn")).toBe("inactive");
    expect(syncOutcomeForStatus("superseded")).toBe("inactive");
  });
});
