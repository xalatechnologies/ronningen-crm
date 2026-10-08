"use server";

import { revalidatePath } from "next/cache";

import { isFeatureEnabled } from "@/lib/feature-flags";
import { composeFrozenDocument, kitchenAccessFrom } from "@/lib/contracts/compose";
import { asJson, contractFrom } from "@/lib/contracts/db";
import { hashFrozenDocument } from "@/lib/contracts/document";
import { generateSecretToken, hashSecretToken } from "@/lib/contracts/crypto";
import { sendBlockingGaps } from "@/lib/contracts/rules";
import { frozenPackageDescription, resolvedLegalTerms } from "@/lib/contracts/paper-copy";
import { mapOrganizationToInvoiceIssuer } from "@/lib/organizations/organization-profile";
import { replaceBookingCommercialChildren } from "@/lib/reservations/atomic-create";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FrozenContractDocument } from "@/lib/contracts/types";

const BOOKINGS_PATH = "/app/bookings";

export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; code?: string };

async function requireStaff(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "authentication_required", supabase, user: null };
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = member?.role;
  if (role !== "owner" && role !== "admin" && role !== "manager") {
    return { ok: false as const, error: "forbidden", supabase, user: null };
  }
  return { ok: true as const, supabase, user };
}

type CatalogOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

function mapCatalogOptions(rows: CatalogOption[] | null): CatalogOption[] {
  return (rows ?? []).map((row) => ({
    ...row,
    price: Number(row.price),
  }));
}

async function loadOrgCommercialCatalog(supabase: Awaited<
  ReturnType<typeof createServerSupabaseClient>
>, organizationId: string) {
  const [packagesQuery, addonsQuery, propertiesQuery] = await Promise.all([
    supabase
      .from("packages")
      .select("id, name, description, price")
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabase
      .from("services")
      .select("id, name, description, price")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", organizationId)
      .order("name"),
  ]);
  return {
    packages: mapCatalogOptions(
      (packagesQuery.data as CatalogOption[] | null) ?? [],
    ),
    addons: mapCatalogOptions((addonsQuery.data as CatalogOption[] | null) ?? []),
    properties: (propertiesQuery.data as { id: string; name: string }[] | null) ?? [],
  };
}

async function loadBookingLineItems(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
  bookingId: string,
) {
  const withDescription = await contractFrom(supabase, "booking_line_items")
    .select("kind, name, quantity, unit_amount_nok, catalog_id, description")
    .eq("booking_id", bookingId)
    .eq("organization_id", organizationId)
    .order("sort_order");
  if (!withDescription.error) return withDescription;
  return contractFrom(supabase, "booking_line_items")
    .select("kind, name, quantity, unit_amount_nok, catalog_id")
    .eq("booking_id", bookingId)
    .eq("organization_id", organizationId)
    .order("sort_order");
}

export async function loadBookingCommercialEditor(input: {
  organizationId: string;
  bookingId: string;
}): Promise<
  ActionResult<{
    lines: {
      kind: string;
      name: string;
      quantity: number;
      unitAmountNok: number;
      catalogId: string | null;
      description: string | null;
    }[];
    packages: CatalogOption[];
    addons: CatalogOption[];
    properties: { id: string; name: string }[];
    installments: {
      label: string;
      amount_nok: number;
      due_date: string | null;
      sort_order: number;
    }[];
  }>
> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return { ok: false, error: staff.error };
  const [linesQuery, catalog, installmentsQuery] = await Promise.all([
    loadBookingLineItems(staff.supabase, input.organizationId, input.bookingId),
    loadOrgCommercialCatalog(staff.supabase, input.organizationId),
    contractFrom(staff.supabase, "booking_payment_installments")
      .select("label, amount_nok, due_date, sort_order")
      .eq("booking_id", input.bookingId)
      .eq("organization_id", input.organizationId)
      .order("sort_order"),
  ]);
  if (linesQuery.error) return { ok: false, error: linesQuery.error.message };
  return {
    ok: true,
    lines: ((linesQuery.data as {
      kind: string;
      name: string;
      quantity: number;
      unit_amount_nok: number;
      catalog_id: string | null;
      description?: string | null;
    }[] | null) ?? []).map((line) => ({
      kind: line.kind,
      name: line.name,
      quantity: Number(line.quantity),
      unitAmountNok: Number(line.unit_amount_nok),
      catalogId: line.catalog_id ?? null,
      description: line.description ?? null,
    })),
    packages: catalog.packages,
    addons: catalog.addons,
    properties: catalog.properties,
    installments: ((installmentsQuery.data as {
      label: string;
      amount_nok: number;
      due_date: string | null;
      sort_order: number;
    }[] | null) ?? []).map((row) => ({
      ...row,
      amount_nok: Number(row.amount_nok),
      sort_order: Number(row.sort_order),
    })),
  };
}

export async function loadInquiryCommercialEditor(input: {
  organizationId: string;
  inquiryId: string;
}): Promise<
  ActionResult<{
    packages: CatalogOption[];
    addons: CatalogOption[];
    commercial: unknown;
  }>
> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return { ok: false, error: staff.error };
  const [catalog, inquiryQuery] = await Promise.all([
    loadOrgCommercialCatalog(staff.supabase, input.organizationId),
    staff.supabase
      .from("booking_inquiries" as never)
      .select("commercial")
      .eq("id", input.inquiryId)
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
  ]);
  return {
    ok: true,
    packages: catalog.packages,
    addons: catalog.addons,
    commercial: (inquiryQuery.data as { commercial?: unknown } | null)?.commercial ?? null,
  };
}

export async function saveBookingCommercialLines(input: {
  organizationId: string;
  bookingId: string;
  lineItems: unknown[];
  installments: unknown[];
}): Promise<ActionResult> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return { ok: false, error: staff.error };
  await replaceBookingCommercialChildren(staff.supabase, {
    organizationId: input.organizationId,
    bookingId: input.bookingId,
    lineItems: input.lineItems,
    installments: input.installments,
  });
  return { ok: true };
}

function rpcError(message: string | undefined): string {
  return message || "contract_rpc_failed";
}

export async function ensureDefaultContractTemplate(
  organizationId: string,
): Promise<ActionResult<{ templateId: string }>> {
  const staff = await requireStaff(organizationId);
  if (!staff.ok) return staff;
  const { data, error } = await staff.supabase.rpc(
    "seed_default_contract_template" as never,
    { p_org: organizationId } as never,
  );
  if (error) return { ok: false, error: rpcError(error.message) };
  return { ok: true, templateId: String(data) };
}

export async function createDraft(input: {
  organizationId: string;
  bookingId: string;
  specialTerms?: string;
  includeInternalNotes?: boolean;
  customerFacingNotes?: string;
}): Promise<ActionResult<{ contractId: string; versionId: string; versionNumber: number }>> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return staff;

  const snapshot = await loadSourceSnapshot(
    staff.supabase,
    input.organizationId,
    input.bookingId,
  );
  if (!snapshot.ok) return snapshot;

  const { data, error } = await staff.supabase.rpc(
    "contract_create_draft" as never,
    {
      payload: asJson({
        organization_id: input.organizationId,
        booking_id: input.bookingId,
        source_snapshot: snapshot.snapshot,
        special_terms: input.specialTerms ?? "",
        include_internal_notes: Boolean(input.includeInternalNotes),
        customer_facing_notes: input.customerFacingNotes ?? "",
        language: "nb",
      }),
    } as never,
  );
  if (error) return { ok: false, error: rpcError(error.message) };
  const row = data as { contractId: string; versionId: string; versionNumber: number };
  revalidatePath(BOOKINGS_PATH);
  return {
    ok: true,
    contractId: row.contractId,
    versionId: row.versionId,
    versionNumber: row.versionNumber,
  };
}

export async function updateDraft(input: {
  organizationId: string;
  bookingId: string;
  versionId: string;
  specialTerms: string;
  includeInternalNotes: boolean;
  customerFacingNotes: string;
  paymentTerms?: string;
  installments?: { label: string; amountNok: number; dueDate: string | null }[];
}): Promise<ActionResult> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return staff;
  const snapshot = await loadSourceSnapshot(
    staff.supabase,
    input.organizationId,
    input.bookingId,
  );
  if (!snapshot.ok) return snapshot;
  if (input.installments) {
    const { error: delError } = await contractFrom(
      staff.supabase,
      "booking_payment_installments",
    )
      .delete()
      .eq("organization_id", input.organizationId)
      .eq("booking_id", input.bookingId);
    if (delError) return { ok: false, error: rpcError(delError.message) };
    if (input.installments.length) {
      const { error: insError } = await contractFrom(
        staff.supabase,
        "booking_payment_installments",
      ).insert(
        input.installments.map((row, index) => ({
          organization_id: input.organizationId,
          booking_id: input.bookingId,
          label: row.label.trim() || "Forfall",
          amount_nok: row.amountNok,
          due_date: row.dueDate,
          sort_order: index,
        })) as never,
      );
      if (insError) return { ok: false, error: rpcError(insError.message) };
    }
  }
  const { error } = await staff.supabase.rpc(
    "contract_update_draft" as never,
    {
      payload: asJson({
        organization_id: input.organizationId,
        version_id: input.versionId,
        source_snapshot: snapshot.snapshot,
        special_terms: input.specialTerms,
        payment_terms: input.paymentTerms ?? "",
        include_internal_notes: input.includeInternalNotes,
        customer_facing_notes: input.customerFacingNotes,
      }),
    } as never,
  );
  if (error) return { ok: false, error: rpcError(error.message) };
  if (input.paymentTerms != null) {
    await contractFrom(staff.supabase, "rental_contract_versions")
      .update({ payment_terms: input.paymentTerms } as never)
      .eq("id", input.versionId)
      .eq("organization_id", input.organizationId);
  }
  revalidatePath(`/app/bookings/${input.bookingId}/contract`);
  return { ok: true };
}

export async function sendContract(input: {
  organizationId: string;
  bookingId: string;
  versionId: string;
  expiresAt?: string;
}): Promise<ActionResult<{ expiresAt: string; inviteUrl: string; emailed: boolean; emailError: string | null }>> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return staff;

  const flag = await isFeatureEnabled("rental_contracts", input.organizationId);
  const { data: org } = await staff.supabase
    .from("organizations")
    .select(
      "legal_name, org_number, address_line1, address_line2, postal_code, city, name, tagline, contact_email, contact_phone, bank_account, payment_instructions, legal_terms_approved_at, contracts_enabled, default_contract_expiry_days",
    )
    .eq("id", input.organizationId)
    .maybeSingle();
  if (!org) return { ok: false, error: "organization_not_found" };

  const composed = await composeVersionDocument({
    supabase: staff.supabase,
    organizationId: input.organizationId,
    bookingId: input.bookingId,
    versionId: input.versionId,
    org,
  });
  if (!composed.ok) return composed;

  const gaps = sendBlockingGaps({
    legalName: issuerName(org),
    orgNumber: org.org_number,
    customerName: composed.document.customer.name,
    customerEmail: composed.document.customer.email,
    venueName: composed.document.booking.venueName,
    totalNok: composed.document.booking.totalNok,
    hasTemplate: Boolean(composed.document.terms.legalTerms),
    legalTermsApproved: Boolean(org.legal_terms_approved_at),
    contractsEnabled: Boolean(org.contracts_enabled),
    featureFlag: flag,
  });
  if (gaps.missing.length) {
    return {
      ok: false,
      error: `send_blocked:${gaps.missing.join(",")}`,
      code: "send_blocked",
    };
  }

  const invite = generateSecretToken();
  const days = org.default_contract_expiry_days ?? 14;
  const expiresAt =
    input.expiresAt ?? new Date(Date.now() + days * 86400000).toISOString();

  const { data, error } = await staff.supabase.rpc(
    "contract_send_version" as never,
    {
      payload: asJson({
        organization_id: input.organizationId,
        version_id: input.versionId,
        frozen_document: composed.document,
        content_hash: composed.contentHash,
        invite_token_hash: hashSecretToken(invite),
        expires_at: expiresAt,
        legal_terms_approved: Boolean(org.legal_terms_approved_at),
        contracts_enabled: Boolean(org.contracts_enabled),
      }),
    } as never,
  );
  if (error) return { ok: false, error: rpcError(error.message) };

  const { sendContractInviteEmail } = await import("@/lib/contracts/mail");
  const mailed = await sendContractInviteEmail({
    to: composed.document.customer.email ?? "",
    inviteToken: invite,
    organizationName: issuerName(org),
    versionId: input.versionId,
    venueName: composed.document.booking.venueName,
    bookingReference: composed.document.booking.reference,
    replyTo: (org as { contact_email?: string | null }).contact_email,
  });
  const { createSupabaseAdminClient } = await import("@/lib/admin/supabase-admin");
  const admin = createSupabaseAdminClient();
  await contractFrom(admin, "contract_email_deliveries").upsert(
    {
      organization_id: input.organizationId,
      version_id: input.versionId,
      to_email: composed.document.customer.email ?? "",
      template_key: "invite",
      idempotency_key: `invite:${input.versionId}:${composed.document.customer.email ?? ""}`,
      provider_message_id: mailed.ok ? mailed.id ?? null : null,
      status: mailed.ok ? "provider_accepted" : "failed",
      last_error: mailed.ok ? null : mailed.error,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "idempotency_key" },
  );
  await contractFrom(admin, "rental_contract_versions")
    .update({
      processing_status: mailed.ok ? "email_sent" : "email_failed",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.versionId);

  revalidatePath(BOOKINGS_PATH);
  revalidatePath(`/app/bookings/${input.bookingId}/contract`);
  const sent = data as { expiresAt?: string };
  const { contractInviteUrl } = await import("@/lib/contracts/mail");
  const inviteUrl = contractInviteUrl(invite);
  if (!mailed.ok) {
    console.warn("[contracts] invite email not delivered", mailed.error);
  }
  return {
    ok: true,
    expiresAt: sent.expiresAt ?? expiresAt,
    inviteUrl,
    emailed: mailed.ok,
    emailError: mailed.ok ? null : mailed.error,
  };
}

function issuerName(org: { legal_name: string | null; name: string }) {
  return org.legal_name?.trim() || org.name;
}

export async function withdrawOffer(input: {
  organizationId: string;
  bookingId: string;
  versionId: string;
}): Promise<ActionResult> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return staff;
  const { error } = await staff.supabase.rpc(
    "contract_withdraw_offer" as never,
    {
      payload: asJson({
        organization_id: input.organizationId,
        version_id: input.versionId,
      }),
    } as never,
  );
  if (error) return { ok: false, error: rpcError(error.message) };
  revalidatePath(`/app/bookings/${input.bookingId}/contract`);
  return { ok: true };
}

export async function createRevision(input: {
  organizationId: string;
  bookingId: string;
}): Promise<ActionResult<{ versionId: string }>> {
  const created = await createDraft(input);
  if (!created.ok) return created;
  return { ok: true, versionId: created.versionId };
}

export async function setContractsPilotSettings(input: {
  organizationId: string;
  contractsEnabled: boolean;
  approveLegalTerms: boolean;
}): Promise<ActionResult> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return staff;
  const { error } = await staff.supabase
    .from("organizations")
    .update({
      contracts_enabled: input.contractsEnabled,
      legal_terms_approved_at: input.approveLegalTerms
        ? new Date().toISOString()
        : null,
    } as never)
    .eq("id", input.organizationId);
  if (error) return { ok: false, error: error.message };
  if (input.contractsEnabled) {
    await ensureDefaultContractTemplate(input.organizationId);
  }
  revalidatePath("/app/settings/kontrakter");
  return { ok: true };
}

type OrgSlice = {
  legal_name: string | null;
  org_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  name: string;
  tagline?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  bank_account?: string | null;
  payment_instructions?: string | null;
};

async function loadSourceSnapshot(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  organizationId: string,
  bookingId: string,
) {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, property_id, notes, total_price, event_type, fest_type, guest_count, event_date, event_end_date, event_start_time, event_end_time, booking_reference, kitchen_access, rental_start_date, rental_end_date, rental_start_time, rental_end_time, timezone, signer_name, signer_title",
    )
    .eq("organization_id", organizationId)
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !booking) {
    return { ok: false as const, error: error?.message ?? "booking_not_found" };
  }
  return {
    ok: true as const,
    snapshot: {
      reservationId: booking.id,
      customerId: booking.customer_id,
      capturedAt: new Date().toISOString(),
      propertyId: booking.property_id,
      notes: booking.notes,
      includeInternalNotes: false,
      booking,
    },
  };
}

async function composeVersionDocument(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  organizationId: string;
  bookingId: string;
  versionId: string;
  org: OrgSlice;
}): Promise<ActionResult<{ document: FrozenContractDocument; contentHash: string }>> {
  const { data: version } = await contractFrom(args.supabase, "rental_contract_versions")
    .select("*")
    .eq("id", args.versionId)
    .eq("organization_id", args.organizationId)
    .maybeSingle();
  if (!version) return { ok: false, error: "version_not_found" };

  const v = version as Record<string, unknown>;
  const { data: booking } = await args.supabase
    .from("bookings")
    .select(
      "id, customer_id, property_id, notes, total_price, event_type, fest_type, guest_count, event_date, event_end_date, event_start_time, event_end_time, booking_reference, kitchen_access, rental_start_date, rental_end_date, rental_start_time, rental_end_time, timezone, signer_name, signer_title, customers(name, email, phone, address, company_name, company_org_number), properties(name, address)",
    )
    .eq("id", args.bookingId)
    .eq("organization_id", args.organizationId)
    .maybeSingle();
  if (!booking) return { ok: false, error: "booking_not_found" };

  const linesQuery = await contractFrom(args.supabase, "booking_line_items")
    .select("kind, name, quantity, unit_amount_nok, catalog_id, description")
    .eq("booking_id", args.bookingId)
    .eq("organization_id", args.organizationId)
    .order("sort_order");
  const lines = linesQuery.error
    ? (
        await contractFrom(args.supabase, "booking_line_items")
          .select("kind, name, quantity, unit_amount_nok, catalog_id")
          .eq("booking_id", args.bookingId)
          .eq("organization_id", args.organizationId)
          .order("sort_order")
      ).data
    : linesQuery.data;
  const { data: installments } = await contractFrom(
    args.supabase,
    "booking_payment_installments",
  )
    .select("label, amount_nok, due_date")
    .eq("booking_id", args.bookingId)
    .eq("organization_id", args.organizationId)
    .order("sort_order");

  const rawLines = ((lines as {
    kind: string;
    name: string;
    quantity: number;
    unit_amount_nok: number;
    catalog_id: string | null;
    description?: string | null;
  }[] | null) ?? []).map((line) => ({
    ...line,
    description: line.description ?? null,
  }));
  const catalogDescriptions = new Map<string, string>();
  const catalogByName = new Map<string, string>();
  const [{ data: pkgs }, { data: svcs }] = await Promise.all([
    args.supabase
      .from("packages")
      .select("id, name, description")
      .eq("organization_id", args.organizationId),
    args.supabase
      .from("services")
      .select("id, name, description")
      .eq("organization_id", args.organizationId),
  ]);
  for (const row of pkgs ?? []) {
    if (row.description) {
      catalogDescriptions.set(row.id, row.description);
      if (row.name) catalogByName.set(row.name.trim().toLocaleLowerCase("nb-NO"), row.description);
    }
  }
  for (const row of svcs ?? []) {
    if (row.description) {
      catalogDescriptions.set(row.id, row.description);
      if (row.name) catalogByName.set(row.name.trim().toLocaleLowerCase("nb-NO"), row.description);
    }
  }

  let legalTerms = "";
  let paymentTerms = "";
  let acceptanceDeclaration = "";
  const templateVersionId = (v.template_version_id as string | null) ?? null;
  if (templateVersionId) {
    const { data: tv } = await contractFrom(args.supabase, "contract_template_versions")
      .select("legal_terms, payment_terms, acceptance_declaration, id")
      .eq("id", templateVersionId)
      .maybeSingle();
    const terms = tv as {
      legal_terms?: string;
      payment_terms?: string;
      acceptance_declaration?: string;
    } | null;
    legalTerms = terms?.legal_terms ?? "";
    paymentTerms = terms?.payment_terms ?? "";
    acceptanceDeclaration = terms?.acceptance_declaration ?? "";
  }
  const versionPaymentTerms = String(v.payment_terms ?? "").trim();
  if (versionPaymentTerms) paymentTerms = versionPaymentTerms;

  const issuer = mapOrganizationToInvoiceIssuer({
    id: args.organizationId,
    name: args.org.name,
    slug: "",
    logo_url: null,
    legal_name: args.org.legal_name,
    tagline: args.org.tagline ?? null,
    org_number: args.org.org_number,
    address_line1: args.org.address_line1,
    address_line2: args.org.address_line2,
    postal_code: args.org.postal_code,
    city: args.org.city,
    contact_email: args.org.contact_email ?? null,
    contact_phone: args.org.contact_phone ?? null,
    bank_account: args.org.bank_account ?? null,
    payment_instructions: args.org.payment_instructions ?? null,
  });

  const customerRel = booking.customers as unknown as {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    company_name: string | null;
    company_org_number: string | null;
  } | null;
  const propertyRel = booking.properties as unknown as {
    name: string | null;
    address: string | null;
  } | null;

  const includeNotes = Boolean(v.include_internal_notes);
  const customerFacing =
    (v.customer_facing_notes as string | null) ||
    (includeNotes ? (booking.notes as string | null) : null);

  const period = (date: string | null, time: string | null) => {
    if (!date) return null;
    return time ? `${date} ${String(time).slice(0, 5)}` : date;
  };

  const previousNumber = v.replaces_version_id
    ? Number(v.version_number) - 1
    : v.expected_base_accepted_version_id
      ? Number(v.version_number) - 1
      : null;

  const document = composeFrozenDocument({
    agreementId: String(v.id),
    contractId: String(v.contract_id),
    versionId: String(v.id),
    versionNumber: Number(v.version_number),
    language: String(v.language ?? "nb"),
    declarationVersion: "v1",
    replacesVersionId: (v.replaces_version_id as string | null) ?? (v.expected_base_accepted_version_id as string | null),
    previousVersionNumber: previousNumber && previousNumber > 0 ? previousNumber : null,
    previousAccepted: Boolean(v.expected_base_accepted_version_id),
    issuer: {
      legalName: args.org.legal_name?.trim() || issuer.name,
      orgNumber: issuer.orgNo,
      addressLines: issuer.addressLines,
      city: args.org.city,
      phone: issuer.contactPhone || null,
      email: issuer.contactEmail || null,
      bankAccount: args.org.bank_account?.trim() || null,
      tagline: args.org.tagline ?? issuer.tagline,
      paymentInstructions: args.org.payment_instructions ?? null,
    },
    customer: {
      name: customerRel?.name ?? "",
      email: customerRel?.email ?? null,
      phone: customerRel?.phone ?? null,
      address: customerRel?.address ?? null,
      companyName: customerRel?.company_name ?? null,
      companyOrgNumber: customerRel?.company_org_number ?? null,
      signerName: (booking.signer_name as string | null) ?? customerRel?.name ?? null,
      signerTitle: (booking.signer_title as string | null) ?? null,
    },
    booking: {
      reservationId: booking.id,
      reference: booking.booking_reference,
      venueName: propertyRel?.name ?? null,
      venueAddress: propertyRel?.address ?? null,
      eventType: booking.event_type,
      festType: booking.fest_type,
      guestCount: Number(booking.guest_count),
      eventStart: period(booking.event_date, booking.event_start_time) ?? booking.event_date,
      eventEnd: period(booking.event_end_date, booking.event_end_time),
      rentalStart: period(
        booking.rental_start_date as string | null,
        booking.rental_start_time as string | null,
      ),
      rentalEnd: period(
        booking.rental_end_date as string | null,
        booking.rental_end_time as string | null,
      ),
      timezone: (booking.timezone as string | null) ?? "Europe/Oslo",
      kitchenAccess: kitchenAccessFrom(booking.kitchen_access as string | null),
      totalNok: Number(booking.total_price),
      lineItems: rawLines.map((line) => ({
        kind: line.kind as FrozenContractDocument["booking"]["lineItems"][number]["kind"],
        name: line.name,
        quantity: Number(line.quantity),
        unitAmountNok: Number(line.unit_amount_nok),
        description:
          line.kind === "package"
            ? frozenPackageDescription(
                line.name,
                (line.catalog_id ? catalogDescriptions.get(line.catalog_id) : null) ||
                  catalogByName.get(line.name.trim().toLocaleLowerCase("nb-NO")) ||
                  line.description,
              )
            : (line.catalog_id ? catalogDescriptions.get(line.catalog_id) : null) ||
              catalogByName.get(line.name.trim().toLocaleLowerCase("nb-NO")) ||
              line.description,
      })),
      installments: ((installments as { label: string; amount_nok: number; due_date: string | null }[] | null) ?? []).map(
        (row) => ({
          label: row.label,
          amountNok: Number(row.amount_nok),
          dueDate: row.due_date,
        }),
      ),
      customerFacingNotes: customerFacing,
    },
    issuedAt:
      (v.sent_at as string | null) ||
      (v.created_at as string | null) ||
      new Date().toISOString(),
    terms: {
      templateVersionId,
      legalTerms: resolvedLegalTerms(legalTerms),
      paymentTerms: paymentTerms.trim() || "Merk betaling med: Arrangementsdato og navn",
      specialTerms: String(v.special_terms ?? ""),
      selectedClauses: [],
      acceptanceDeclaration:
        acceptanceDeclaration.trim() ||
        "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.",
    },
  });

  return { ok: true, document, contentHash: hashFrozenDocument(document) };
}

export async function previewContractDocument(input: {
  organizationId: string;
  bookingId: string;
  versionId: string;
}): Promise<ActionResult<{ document: FrozenContractDocument; contentHash: string }>> {
  const staff = await requireStaff(input.organizationId);
  if (!staff.ok) return staff;
  const { data: org } = await staff.supabase
    .from("organizations")
    .select(
      "legal_name, org_number, address_line1, address_line2, postal_code, city, name, tagline, contact_email, contact_phone, bank_account, payment_instructions",
    )
    .eq("id", input.organizationId)
    .maybeSingle();
  if (!org) return { ok: false, error: "organization_not_found" };
  return composeVersionDocument({
    supabase: staff.supabase,
    organizationId: input.organizationId,
    bookingId: input.bookingId,
    versionId: input.versionId,
    org,
  });
}
