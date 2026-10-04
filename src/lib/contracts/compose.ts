import type { FrozenContractDocument, KitchenAccess } from "@/lib/contracts/types";
import { replacementNoticeText } from "@/lib/contracts/document";

export type ComposeInput = {
  agreementId: string;
  contractId: string;
  versionId: string;
  versionNumber: number;
  language: string;
  declarationVersion: string;
  replacesVersionId: string | null;
  previousVersionNumber: number | null;
  previousAccepted: boolean;
  issuer: FrozenContractDocument["issuer"];
  customer: FrozenContractDocument["customer"];
  booking: FrozenContractDocument["booking"];
  issuedAt: string | null;
  terms: FrozenContractDocument["terms"];
};

export function composeFrozenDocument(input: ComposeInput): FrozenContractDocument {
  return {
    schemaVersion: 1,
    language: input.language,
    declarationVersion: input.declarationVersion,
    agreementId: input.agreementId,
    contractId: input.contractId,
    versionId: input.versionId,
    versionNumber: input.versionNumber,
    replacesVersionId: input.replacesVersionId,
    replacementNotice: replacementNoticeText({
      language: input.language,
      previousVersionNumber: input.previousVersionNumber,
      previousAccepted: input.previousAccepted,
    }),
    issuer: input.issuer,
    customer: input.customer,
    booking: input.booking,
    issuedAt: input.issuedAt,
    terms: input.terms,
  };
}

export function kitchenAccessFrom(value: string | null | undefined): KitchenAccess {
  if (value === "included" || value === "excluded") return value;
  return "unknown";
}
