import { contentHashFromDocument } from "@/lib/contracts/crypto";
import type { FrozenContractDocument } from "@/lib/contracts/types";

export function replacementNoticeText(args: {
  language: string;
  previousVersionNumber: number | null;
  previousAccepted: boolean;
}): string | null {
  if (args.previousVersionNumber == null) return null;
  if (args.language === "en") {
    return args.previousAccepted
      ? `This version replaces the previously accepted agreement (version ${args.previousVersionNumber}). The earlier accepted agreement remains on file. This document is the offer the customer is asked to accept now.`
      : `This version replaces the outstanding unsigned offer (version ${args.previousVersionNumber}). Signing access to the previous offer is withdrawn when this version is sent.`;
  }
  return args.previousAccepted
    ? `Denne versjonen erstatter tidligere godkjent avtale (versjon ${args.previousVersionNumber}). Den tidligere godkjente avtalen beholdes i arkivet. Dette dokumentet er tilbudet kunden bes godkjenne nå.`
    : `Denne versjonen erstatter det utestående usignerte tilbudet (versjon ${args.previousVersionNumber}). Signeringsadgang til det forrige tilbudet trekkes tilbake når denne versjonen sendes.`;
}

export function hashFrozenDocument(document: FrozenContractDocument): string {
  return contentHashFromDocument(document);
}
