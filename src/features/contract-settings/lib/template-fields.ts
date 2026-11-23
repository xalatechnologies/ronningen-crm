import type { TemplateInput } from "@/lib/contracts/template-schema";

export type TemplateFields = {
  legalTerms: string;
  paymentTerms: string;
  acceptanceDeclaration: string;
  closingLine: string;
  signerName: string;
  signaturePath: string | null;
};

export const LEGAL_TERMS_MAX = 60000;

/** Template values as the form edits them: missing optional text becomes an empty string. */
export function toTemplateFields(input: TemplateInput): TemplateFields {
  return {
    legalTerms: input.legalTerms,
    paymentTerms: input.paymentTerms,
    acceptanceDeclaration: input.acceptanceDeclaration,
    closingLine: input.closingLine ?? "",
    signerName: input.signerName ?? "",
    signaturePath: input.signaturePath,
  };
}

export function templateFieldsEqual(a: TemplateFields, b: TemplateFields): boolean {
  return (
    a.legalTerms === b.legalTerms &&
    a.paymentTerms === b.paymentTerms &&
    a.acceptanceDeclaration === b.acceptanceDeclaration &&
    a.closingLine === b.closingLine &&
    a.signerName === b.signerName &&
    a.signaturePath === b.signaturePath
  );
}

/** Why the template cannot be saved yet, or null when it can. The server checks the same rules. */
export function templateFieldsError(fields: TemplateFields): "legal_terms" | "declaration" | null {
  if (!fields.legalTerms.trim()) return "legal_terms";
  if (!fields.acceptanceDeclaration.trim()) return "declaration";
  return null;
}
