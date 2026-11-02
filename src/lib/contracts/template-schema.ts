import { z } from "zod";

import { sha256Hex } from "@/lib/contracts/crypto";
import { isSignaturePath } from "@/lib/contracts/signature";

const stripControl = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, "");
const optionalText = (max: number, sanitize = false) =>
  z
    .string()
    .max(max * 2)
    .nullish()
    .transform((value) => {
      const text = (sanitize ? stripControl(value ?? "") : (value ?? "")).trim();
      return text ? text : null;
    })
    .refine((value) => value === null || value.length <= max, `max ${max} characters`);

export const templateInputSchema = z.object({
  legalTerms: z.string().trim().min(1).max(60000),
  paymentTerms: z.string().trim().max(2000),
  acceptanceDeclaration: z.string().trim().min(1).max(1000),
  closingLine: optionalText(300),
  signerName: optionalText(120, true),
  signaturePath: z
    .string()
    .nullish()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || isSignaturePath(value), "invalid signature path"),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

export function hashTemplateContent(input: TemplateInput): string {
  return sha256Hex(
    Buffer.from(
      JSON.stringify([
        input.legalTerms,
        input.paymentTerms,
        input.acceptanceDeclaration,
        input.closingLine,
        input.signerName,
        input.signaturePath,
      ]),
      "utf8",
    ),
  );
}
