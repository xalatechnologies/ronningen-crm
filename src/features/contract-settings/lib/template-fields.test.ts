import { describe, expect, it } from "vitest";

import { templateFieldsEqual, templateFieldsError, toTemplateFields } from "@/features/contract-settings/lib/template-fields";

const input = {
  legalTerms: "Vilkår",
  paymentTerms: "Betal",
  acceptanceDeclaration: "Jeg godtar",
  closingLine: null,
  signerName: null,
  signaturePath: null,
};

describe("toTemplateFields", () => {
  it("turns missing optional text into empty strings", () => {
    expect(toTemplateFields(input)).toMatchObject({ closingLine: "", signerName: "", signaturePath: null });
  });
});

describe("templateFieldsEqual", () => {
  it("compares every field", () => {
    const a = toTemplateFields(input);
    expect(templateFieldsEqual(a, { ...a })).toBe(true);
    expect(templateFieldsEqual(a, { ...a, signerName: "Ola" })).toBe(false);
    expect(templateFieldsEqual(a, { ...a, signaturePath: "x/y.png" })).toBe(false);
  });
});

describe("templateFieldsError", () => {
  it("requires terms and the declaration, ignoring blank space", () => {
    const a = toTemplateFields(input);
    expect(templateFieldsError(a)).toBeNull();
    expect(templateFieldsError({ ...a, legalTerms: "   " })).toBe("legal_terms");
    expect(templateFieldsError({ ...a, acceptanceDeclaration: "" })).toBe("declaration");
  });
});
