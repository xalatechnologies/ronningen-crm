import { describe, expect, it } from "vitest";

import { contentHashFromDocument, hashSecretToken, stableStringify } from "@/lib/contracts/crypto";
import { composeFrozenDocument } from "@/lib/contracts/compose";
import { hashFrozenDocument } from "@/lib/contracts/document";
import {
  canAcceptVersion,
  creatingDraftSupersedesOutstanding,
  parseSendBlockedError,
  sendBlockingGaps,
  sendReplacesOutstanding,
} from "@/lib/contracts/rules";

describe("contract rules", () => {
  it("does not supersede an outstanding offer when creating a draft", () => {
    expect(creatingDraftSupersedesOutstanding()).toBe(false);
    expect(sendReplacesOutstanding()).toBe(true);
  });

  it("allows accept from sent without requiring viewed", () => {
    expect(canAcceptVersion("sent")).toBe(true);
    expect(canAcceptVersion("viewed")).toBe(true);
    expect(canAcceptVersion("draft")).toBe(false);
    expect(canAcceptVersion("accepted")).toBe(false);
  });

  it("blocks send without legal approval and venue", () => {
    const gaps = sendBlockingGaps({
      legalName: "Rønningen AS",
      orgNumber: "123",
      customerName: "Ola",
      customerEmail: "ola@example.com",
      venueName: null,
      totalNok: 1000,
      hasTemplate: true,
      legalTermsApproved: false,
      contractsEnabled: true,
      featureFlag: true,
    });
    expect(gaps.missing).toContain("venue");
    expect(gaps.missing).toContain("legalTermsApproved");
  });

  it("parses send_blocked codes from the action error", () => {
    expect(parseSendBlockedError("send_blocked:issuerOrgNumber,venue")).toEqual([
      "issuerOrgNumber",
      "venue",
    ]);
    expect(parseSendBlockedError("forbidden")).toBeNull();
  });
});

describe("content hashing", () => {
  it("is stable regardless of key order", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(contentHashFromDocument({ a: 1 })).toBe(contentHashFromDocument({ a: 1 }));
  });

  it("hashes invitation tokens rather than storing them", () => {
    const hash = hashSecretToken("abc");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("abc");
  });
});

describe("frozen document", () => {
  it("embeds replacement wording in the document, not only a pointer", () => {
    const doc = composeFrozenDocument({
      agreementId: "v2",
      contractId: "c1",
      versionId: "v2",
      versionNumber: 2,
      language: "nb",
      declarationVersion: "v1",
      replacesVersionId: "v1",
      previousVersionNumber: 1,
      previousAccepted: true,
      issuer: {
        legalName: "Rønningen AS",
        orgNumber: "1",
        addressLines: [],
        city: "Sylling",
        phone: "96665001",
        email: "post@example.no",
        bankAccount: "1520.3197583",
        tagline: null,
        paymentInstructions: null,
      },
      customer: {
        name: "Ola",
        email: "a@b.no",
        phone: null,
        address: null,
        companyName: null,
        companyOrgNumber: null,
        signerName: "Ola",
        signerTitle: null,
      },
      booking: {
        reservationId: "b1",
        reference: null,
        venueName: "Hovedhuset",
        venueAddress: null,
        eventType: "Privat",
        festType: "Bryllup",
        guestCount: 80,
        eventStart: "2026-06-01",
        eventEnd: null,
        rentalStart: null,
        rentalEnd: null,
        timezone: "Europe/Oslo",
        kitchenAccess: "included",
        totalNok: 10000,
        lineItems: [],
        installments: [],
        customerFacingNotes: null,
      },
      issuedAt: "2026-05-18",
      terms: {
        templateVersionId: "t1",
        legalTerms: "Vilkår",
        paymentTerms: "Betaling",
        specialTerms: "",
        selectedClauses: [],
        acceptanceDeclaration: "Jeg godtar",
      },
    });
    expect(doc.replacementNotice).toMatch(/versjon 1/);
    expect(hashFrozenDocument(doc)).toHaveLength(64);
  });
});
