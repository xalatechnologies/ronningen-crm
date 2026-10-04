import { describe, expect, it } from "vitest";

import { composeFrozenDocument } from "@/lib/contracts/compose";
import {
  contractExtraLines,
  contractPartyFacts,
  emphasizeWifiPassword,
  formatContractDateTime,
  formatContractLineAmount,
  formatContractNok,
  packageHeadline,
  packageInclusions,
  primaryPackageLine,
  splitContractTermLines,
  summarizeContractExtra,
} from "@/lib/contracts/layout";
import { buildAcceptedPdf } from "@/lib/contracts/pdf";
import { parsePackageDescription } from "@/lib/pricing/parse-package-description";

const plusDescription = `Enklere og mer ferdig løsning
- Alt i Basis
- Oppdekning (bord, stoler, duk, stoltrekk, servietter)
- Lyd og Lys`;

function sampleDoc() {
  return composeFrozenDocument({
    agreementId: "v1",
    contractId: "c1",
    versionId: "v1",
    versionNumber: 1,
    language: "nb",
    declarationVersion: "v1",
    replacesVersionId: null,
    previousVersionNumber: null,
    previousAccepted: false,
    issuer: {
      legalName: "Rønningen Gård og Event AS",
      orgNumber: "918327177",
      addressLines: ["Baneveien 290", "3410 Sylling"],
      city: "Sylling",
      phone: "96665001 / 96652666",
      email: "post@ronningenselskapslokale.no",
      bankAccount: "1520.3197583",
      tagline: "www.ronningenselskapslokale.no",
      paymentInstructions: null,
    },
    customer: {
      name: "Heonaz Hosseini",
      email: "heonaz@hotmail.com",
      phone: "97886934",
      address: null,
      companyName: null,
      companyOrgNumber: null,
      signerName: "Heonaz Hosseini",
      signerTitle: null,
    },
    booking: {
      reservationId: "b1",
      reference: "RN-2026-001",
      venueName: "Rønningen selskaplokalet",
      venueAddress: null,
      eventType: "Privat",
      festType: "Bryllup",
      guestCount: 200,
      eventStart: "2027-06-05",
      eventEnd: null,
      rentalStart: null,
      rentalEnd: null,
      timezone: "Europe/Oslo",
      kitchenAccess: "included",
      totalNok: 55000,
      lineItems: [
        {
          kind: "package",
          name: "Plus",
          quantity: 1,
          unitAmountNok: 52000,
          description: plusDescription,
        },
        {
          kind: "addon",
          name: "Lydanlegg",
          quantity: 1,
          unitAmountNok: 3000,
          description: "- PA-anlegg\n- Tekniker under arrangementet",
        },
      ],
      installments: [
        { label: "Første innbetaling (ved kontraktsinngåelse)", amountNok: 27500, dueDate: null },
        { label: "Andre innbetaling", amountNok: 27500, dueDate: "2027-03-05" },
      ],
      customerFacingNotes: null,
    },
    issuedAt: "2026-05-18",
    terms: {
      templateVersionId: "t1",
      legalTerms: "4. Betingelser",
      paymentTerms: "Merk betaling med: Arrangementsdato og navn",
      specialTerms: "",
      selectedClauses: [],
      acceptanceDeclaration:
        "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.",
    },
  });
}

describe("package inclusions", () => {
  it("parses tagline and bullets from package description", () => {
    const parsed = parsePackageDescription(plusDescription);
    expect(parsed.tagline).toBe("Enklere og mer ferdig løsning");
    expect(parsed.features).toContain("Lyd og Lys");
    expect(packageInclusions(plusDescription).features).toHaveLength(3);
  });

  it("builds PLUS PAKKE headline from the chosen package name", () => {
    expect(packageHeadline("Plus")).toBe("PLUS PAKKE");
    expect(packageHeadline("Plus pakken")).toMatch(/PLUS/);
  });

  it("keeps the chosen catalog package text instead of replacing it", () => {
    const filled = packageInclusions(plusDescription, "Plus");
    expect(filled.tagline).toBe("Enklere og mer ferdig løsning");
    expect(filled.features).toContain("Oppdekning (bord, stoler, duk, stoltrekk, servietter)");
    expect(filled.features).not.toContain("Sikkerhetspersonell som bistår under arrangementet");
  });

  it("turns a comma-separated package description into inclusion bullets", () => {
    const filled = packageInclusions(
      "Lokale med bord og stoler, Sluttrenhold, Fultutstyrt kjøkken, Teknisk utstyr som Lyd&Lys, 1 personell, Medbrakt mat/catering, medbrakt drikke",
      "Basis",
    );
    expect(filled.features).toContain("Lokale med bord og stoler");
    expect(filled.features).toContain("Fultutstyrt kjøkken");
    expect(filled.features).toContain("medbrakt drikke");
  });

  it("turns custom package bullet description into inclusion bullets", () => {
    const filled = packageInclusions(
      "- Lokale med bord og stoler\n- Sluttrenhold",
      "Helgepakke",
    );
    expect(filled.features).toEqual([
      "Lokale med bord og stoler",
      "Sluttrenhold",
    ]);
  });

  it("keeps selected catalog add-ons on the snapshot", () => {
    const extras = contractExtraLines(sampleDoc().booking.lineItems);
    expect(extras.map((item) => item.name)).toEqual(["Lydanlegg"]);
    expect(packageInclusions(extras[0]?.description).features).toContain("PA-anlegg");
  });

  it("collapses extra copy into one line and drops sales catalog text", () => {
    expect(summarizeContractExtra("- PA-anlegg\n- Tekniker under arrangementet")).toBe(
      "PA-anlegg, Tekniker under arrangementet",
    );
    expect(
      summarizeContractExtra(
        "Våre fullpakker er beregnet for arrangementer med opptil 100 personer.\n- Enkel dekorpakke fra 30.000 kr\n- Elegant pakke fra 50.000 kr",
      ),
    ).toBeNull();
    expect(formatContractLineAmount(0)).toBe("Avtales");
    expect(formatContractLineAmount(3000)).toContain("3");
  });

  it("aligns lessor and lessee as labeled facts", () => {
    const facts = contractPartyFacts(sampleDoc());
    expect(facts.lessor.map((row) => row.label)).toEqual([
      "Navn",
      "Org.nr",
      "Adresse",
      "Telefon",
      "E-post",
    ]);
    expect(facts.lessee.map((row) => row.label)).toContain("Lokale");
    expect(facts.lessee.find((row) => row.label === "Dato")?.value).toBe("05.06.2027");
  });
});

describe("legal term titles", () => {
  it("marks Betingelser and husregel headings as titles", () => {
    const kinds = Object.fromEntries(
      splitContractTermLines(`4. Betingelser
• Reservasjon er gyldig.

6. Informasjonsskriv og husregler
Følgende regler gjelder for arrangementet:

Adkomst og parkering
• Fartsgrensen på innkjøringsveien er 30 km/t.
`).map((line) => [line.text.trim(), line.kind]),
    );
    expect(kinds["4. Betingelser"]).toBe("section");
    expect(kinds["6. Informasjonsskriv og husregler"]).toBe("section");
    expect(kinds["Adkomst og parkering"]).toBe("subtitle");
  });

  it("marks the wifi password as bold", () => {
    const parts = emphasizeWifiPassword(
      "• Nettverksnavn: Rønningen Selskapslokale Passord: Fest2019",
    );
    expect(parts.find((part) => part.bold)?.text).toBe("Fest2019");
  });

  it("formats the lessee signing time in Europe/Oslo", () => {
    expect(formatContractDateTime("2026-05-18T13:21:00.000Z")).toMatch(
      /18\.05\.2026, 15[:.]21/,
    );
  });
});

describe("frozen package snapshot", () => {
  it("keeps package description and issuer bank details on the document", () => {
    const doc = sampleDoc();
    const pkg = primaryPackageLine(doc.booking.lineItems);
    expect(pkg?.name).toBe("Plus");
    expect(pkg?.description).toContain("Oppdekning");
    expect(doc.issuer.bankAccount).toBe("1520.3197583");
    expect(doc.issuer.phone).toContain("96665001");
    expect(formatContractNok(55000)).toContain("55");
  });
});

describe("accepted PDF", () => {
  it("includes package title and signed name", async () => {
    const { bytes } = await buildAcceptedPdf({
      document: sampleDoc(),
      acceptedAtIso: "2026-05-18T13:21:00.000Z",
      acceptedFullName: "wahid",
    });
    const { inflateSync } = await import("node:zlib");
    const raw = Buffer.from(bytes);
    const streams = [...raw.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
    const inflated = streams
      .map((match) => {
        try {
          return inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1");
        } catch {
          return "";
        }
      })
      .join("\n");
    const decoded = [...inflated.matchAll(/<([0-9A-Fa-f]+)> Tj/g)]
      .map((match) => Buffer.from(match[1]!, "hex").toString("latin1"))
      .join("\n");
    expect(decoded).toContain("Lydanlegg");
    expect(decoded).toContain("PA-anlegg");
    expect(decoded).toContain("Informasjonsskriv");
    expect(decoded).toContain("3 mnd. før arrangementet");
    expect(decoded).toContain("LEIEAVTALE");
    expect(decoded).toContain("Rønningen Gård og Event AS");
    expect(decoded).toContain("PLUS PAKKE");
    expect(decoded).toContain("LEIETAKER");
    expect(decoded).toContain("wahid");
    expect(decoded).toContain("Heonaz Hosseini");
    expect(decoded).toContain("Hameed Rahmani");
    expect(decoded).toContain("1520.3197583");
    expect(decoded).not.toMatch(/\? (Lokale|Sluttrenhold|Reservasjon)/);
    expect(raw.toString("latin1")).toContain("/Subtype /Image");
  });
});
