import { describe, expect, it } from "vitest";

import { hashTemplateContent, templateInputSchema } from "@/lib/contracts/template-schema";

const base = {
  legalTerms: "4. Betingelser\n• Test",
  paymentTerms: "Merk betaling",
  acceptanceDeclaration: "Jeg bekrefter.",
  closingLine: "Takk!",
  signerName: "Kari Nordmann",
  signaturePath: null,
};

describe("templateInputSchema", () => {
  it("accepts a normal template", () => {
    expect(templateInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects empty or whitespace-only legal terms", () => {
    expect(templateInputSchema.safeParse({ ...base, legalTerms: "   " }).success).toBe(false);
  });

  it("rejects legal terms over 60000 characters", () => {
    expect(
      templateInputSchema.safeParse({ ...base, legalTerms: "a".repeat(60001) }).success,
    ).toBe(false);
  });

  it("rejects an empty acceptance declaration", () => {
    expect(templateInputSchema.safeParse({ ...base, acceptanceDeclaration: "" }).success).toBe(
      false,
    );
  });

  it("strips control characters from the signer name", () => {
    const parsed = templateInputSchema.parse({ ...base, signerName: "Kari\u0007 Nord\nmann" });
    expect(parsed.signerName).toBe("Kari Nordmann");
  });

  it("turns blank optional fields into null", () => {
    const parsed = templateInputSchema.parse({ ...base, closingLine: "  ", signerName: "" });
    expect(parsed.closingLine).toBeNull();
    expect(parsed.signerName).toBeNull();
  });

  it("rejects a signature path that is not a stored signature", () => {
    expect(templateInputSchema.safeParse({ ...base, signaturePath: "../etc/passwd" }).success).toBe(
      false,
    );
  });
});

describe("hashTemplateContent", () => {
  it("is stable for equal input and changes with any field", () => {
    const a = templateInputSchema.parse(base);
    expect(hashTemplateContent(a)).toBe(hashTemplateContent(templateInputSchema.parse(base)));
    for (const key of ["legalTerms", "paymentTerms", "acceptanceDeclaration", "closingLine", "signerName"] as const) {
      const changed = templateInputSchema.parse({ ...base, [key]: `${base[key]}!` });
      expect(hashTemplateContent(changed)).not.toBe(hashTemplateContent(a));
    }
  });
});
