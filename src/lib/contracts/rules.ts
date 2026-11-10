import type { ContractStatus } from "@/lib/contracts/types";
import { OUTSTANDING_STATUSES } from "@/lib/contracts/types";

export function isOutstandingOffer(status: ContractStatus): boolean {
  return (OUTSTANDING_STATUSES as readonly string[]).includes(status);
}

export function canEditVersion(status: ContractStatus): boolean {
  return status === "draft";
}

export function canSendVersion(status: ContractStatus): boolean {
  return status === "draft";
}

export function canAcceptVersion(status: ContractStatus): boolean {
  return status === "sent" || status === "viewed";
}

export function creatingDraftSupersedesOutstanding(): boolean {
  return false;
}

export function sendReplacesOutstanding(): boolean {
  return true;
}

export type SendGate = {
  missing: string[];
};

export function sendBlockingGaps(input: {
  legalName: string | null | undefined;
  orgNumber: string | null | undefined;
  customerName: string | null | undefined;
  customerEmail: string | null | undefined;
  venueName: string | null | undefined;
  totalNok: number | null | undefined;
  hasTemplate: boolean;
  legalTermsApproved: boolean;
  contractsEnabled: boolean;
  featureFlag: boolean;
}): SendGate {
  const missing: string[] = [];
  if (!input.featureFlag) missing.push("featureFlag");
  if (!input.contractsEnabled) missing.push("contractsEnabled");
  if (!input.legalTermsApproved) missing.push("legalTermsApproved");
  if (!input.hasTemplate) missing.push("template");
  if (!input.legalName?.trim()) missing.push("issuerLegalName");
  if (!input.orgNumber?.trim()) missing.push("issuerOrgNumber");
  if (!input.customerName?.trim()) missing.push("customerName");
  if (!input.customerEmail?.trim()) missing.push("customerEmail");
  if (!input.venueName?.trim()) missing.push("venue");
  if (input.totalNok == null || Number.isNaN(input.totalNok)) missing.push("price");
  return { missing };
}

export function parseSendBlockedError(error: string): string[] | null {
  if (!error.startsWith("send_blocked:")) return null;
  const list = error
    .slice("send_blocked:".length)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return list.length ? list : [];
}
