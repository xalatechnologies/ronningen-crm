import type { OrganizationProfileFormInput } from "@/lib/validations";

export type OrganizationProfileRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  legal_name: string | null;
  tagline: string | null;
  org_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  bank_account: string | null;
  payment_instructions: string | null;
};

export type InvoiceIssuerDisplay = {
  name: string;
  tagline: string;
  subtitle: string;
  orgNo: string;
  addressLines: string[];
  contactEmail: string;
  contactPhone: string;
  bankInfo: string;
};

export function organizationRowToFormDefaults(
  row: OrganizationProfileRow,
): OrganizationProfileFormInput {
  return {
    name: row.name,
    legalName: row.legal_name ?? "",
    tagline: row.tagline ?? "",
    orgNumber: row.org_number ?? "",
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    postalCode: row.postal_code ?? "",
    city: row.city ?? "",
    contactEmail: row.contact_email ?? "",
    contactPhone: row.contact_phone ?? "",
    logoUrl: row.logo_url ?? "",
    bankAccount: row.bank_account ?? "",
    paymentInstructions: row.payment_instructions ?? "",
  };
}

export function formInputToOrganizationUpdate(
  data: OrganizationProfileFormInput,
) {
  const emptyToNull = (v: string | undefined) => {
    const t = v?.trim();
    return t ? t : null;
  };

  return {
    name: data.name.trim(),
    legal_name: emptyToNull(data.legalName),
    tagline: emptyToNull(data.tagline),
    org_number: emptyToNull(data.orgNumber),
    address_line1: emptyToNull(data.addressLine1),
    address_line2: emptyToNull(data.addressLine2),
    postal_code: emptyToNull(data.postalCode),
    city: emptyToNull(data.city),
    contact_email: emptyToNull(data.contactEmail),
    contact_phone: emptyToNull(data.contactPhone),
    logo_url: emptyToNull(data.logoUrl),
    bank_account: emptyToNull(data.bankAccount),
    payment_instructions: emptyToNull(data.paymentInstructions),
  };
}

export function mapOrganizationToInvoiceIssuer(
  row: OrganizationProfileRow,
): InvoiceIssuerDisplay {
  const displayName = row.legal_name?.trim() || row.name;
  const tagline =
    row.tagline?.trim() || "Selskapslokale og arrangement";
  const addressLines: string[] = [];
  if (row.address_line1?.trim()) addressLines.push(row.address_line1.trim());
  if (row.address_line2?.trim()) addressLines.push(row.address_line2.trim());
  const cityLine = [row.postal_code?.trim(), row.city?.trim()]
    .filter(Boolean)
    .join(" ");
  if (cityLine) addressLines.push(cityLine);

  const bankParts = [
    row.bank_account?.trim(),
    row.payment_instructions?.trim(),
  ].filter(Boolean);

  return {
    name: displayName,
    tagline,
    subtitle:
      addressLines.length > 0 || row.org_number?.trim()
        ? ""
        : "Oppdater virksomhetsadresse og betalingsinformasjon under Innstillinger → Organisasjon.",
    orgNo: row.org_number?.trim() ?? "",
    addressLines,
    contactEmail: row.contact_email?.trim() ?? "",
    contactPhone: row.contact_phone?.trim() ?? "",
    bankInfo:
      bankParts.join("\n\n") ||
      "Kontonummer og KID avtales direkte ved fakturering.",
  };
}
