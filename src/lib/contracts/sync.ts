import { stableStringify } from "@/lib/contracts/crypto";
import type { FrozenContractDocument } from "@/lib/contracts/types";

/**
 * The booking-driven part of a contract document. Issuer details, template legal text and
 * catalog descriptions are left out on purpose: they are not booking edits, so changing them
 * must not flag every sent contract as out of date.
 */
function meaningfulContent(doc: FrozenContractDocument) {
  return {
    customer: doc.customer,
    booking: {
      ...doc.booking,
      lineItems: doc.booking.lineItems.map((line) => ({
        kind: line.kind,
        name: line.name,
        quantity: line.quantity,
        unitAmountNok: line.unitAmountNok,
      })),
    },
    specialTerms: doc.terms.specialTerms,
    paymentTerms: doc.terms.paymentTerms,
  };
}

/** True when the booking now differs from what the (frozen) contract version says. */
export function contractOutOfSync(
  frozen: FrozenContractDocument,
  current: FrozenContractDocument,
): boolean {
  return stableStringify(meaningfulContent(frozen)) !== stableStringify(meaningfulContent(current));
}

export type ContractSyncOutcome =
  | "no_contract"
  | "draft_is_live"
  | "unchanged"
  | "revision_created"
  | "revision_exists"
  | "inactive";

/** Decide what to do from the latest version status alone (before any comparison). */
export function syncOutcomeForStatus(
  status: string,
): "draft_is_live" | "inactive" | "compare" {
  if (status === "draft") return "draft_is_live";
  if (status === "sent" || status === "viewed" || status === "accepted") return "compare";
  return "inactive";
}
