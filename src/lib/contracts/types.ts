export const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "expired",
  "cancelled",
  "superseded",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const OUTSTANDING_STATUSES: readonly ContractStatus[] = ["sent", "viewed"];

export type LineItemKind =
  | "package"
  | "addon"
  | "kitchen"
  | "custom"
  | "adjustment";

export type KitchenAccess = "included" | "excluded" | "unknown";

export type FrozenLineItem = {
  kind: LineItemKind;
  name: string;
  quantity: number;
  unitAmountNok: number;
  description: string | null;
};

export type FrozenInstallment = {
  label: string;
  amountNok: number;
  dueDate: string | null;
};

export type FrozenContractDocument = {
  schemaVersion: 1;
  language: string;
  declarationVersion: string;
  agreementId: string;
  contractId: string;
  versionId: string;
  versionNumber: number;
  replacesVersionId: string | null;
  replacementNotice: string | null;
  issuer: {
    legalName: string;
    orgNumber: string;
    addressLines: string[];
    city: string | null;
    phone: string | null;
    email: string | null;
    bankAccount: string | null;
    tagline: string | null;
    paymentInstructions: string | null;
  };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    companyName: string | null;
    companyOrgNumber: string | null;
    signerName: string | null;
    signerTitle: string | null;
  };
  booking: {
    reservationId: string;
    reference: string | null;
    venueName: string | null;
    venueAddress: string | null;
    eventType: string;
    festType: string | null;
    guestCount: number;
    eventStart: string;
    eventEnd: string | null;
    rentalStart: string | null;
    rentalEnd: string | null;
    timezone: string;
    kitchenAccess: KitchenAccess;
    totalNok: number;
    lineItems: FrozenLineItem[];
    installments: FrozenInstallment[];
    customerFacingNotes: string | null;
  };
  issuedAt: string | null;
  terms: {
    templateVersionId: string | null;
    legalTerms: string;
    paymentTerms: string;
    specialTerms: string;
    selectedClauses: string[];
    acceptanceDeclaration: string;
  };
};

export type BookingSourceSnapshot = {
  reservationId: string;
  customerId: string;
  capturedAt: string;
  propertyId: string | null;
  notes: string | null;
  includeInternalNotes: boolean;
};
