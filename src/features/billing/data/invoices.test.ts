import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const isBillingEnabled = vi.fn();
const assertBillingConfigured = vi.fn();
const requireOrganizationOwner = vi.fn();
const invoicesList = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/billing/constants", () => ({ isBillingEnabled: () => isBillingEnabled() }));
vi.mock("@/lib/billing/billing-env", () => ({ assertBillingConfigured: () => assertBillingConfigured() }));
vi.mock("@/lib/billing/require-organization-owner", () => ({ requireOrganizationOwner: (id: string) => requireOrganizationOwner(id) }));
vi.mock("@/lib/billing/stripe", () => ({ getStripeClient: () => ({ invoices: { list: invoicesList } }) }));
vi.mock("@/lib/admin/supabase-admin", () => ({ createSupabaseAdminClient: () => ({ from }) }));
vi.mock("@/lib/i18n/server-messages", () => ({ getServerT: async () => (key: string) => key }));

import { listInvoicesForOrganization } from "@/features/billing/data/invoices";

const stripeInvoice = { id: "in_1", number: "N-1", status: "paid", created: 1_790_000_000, currency: "nok", total: 75000, amount_paid: 75000 };

beforeEach(() => {
  vi.clearAllMocks();
  isBillingEnabled.mockReturnValue(true);
  assertBillingConfigured.mockReturnValue({ ok: true });
  requireOrganizationOwner.mockResolvedValue({ ok: true, owner: { userId: "owner-1", email: null } });
  maybeSingle.mockResolvedValue({ data: { provider_customer_id: "cus_org1" } });
  invoicesList.mockResolvedValue({ data: [stripeInvoice] });
});

describe("listInvoicesForOrganization", () => {
  it("returns the invoices of the organization's own Stripe customer", async () => {
    const result = await listInvoicesForOrganization("org-1", "owner-1");
    expect(result).toMatchObject({ ok: true, invoices: [{ id: "in_1", amount: 750, status: "paid" }] });
    expect(invoicesList).toHaveBeenCalledWith({ customer: "cus_org1", limit: 24 });
    expect(eq).toHaveBeenCalledWith("organization_id", "org-1");
  });

  it("refuses when billing is off, and never calls Stripe", async () => {
    isBillingEnabled.mockReturnValue(false);
    expect(await listInvoicesForOrganization("org-1", "owner-1")).toMatchObject({ ok: false });
    expect(invoicesList).not.toHaveBeenCalled();
  });

  it("refuses someone who is not the owner of that organization", async () => {
    requireOrganizationOwner.mockResolvedValue({ ok: false, error: "owner only" });
    expect(await listInvoicesForOrganization("org-1", "u2")).toEqual({ ok: false, error: "owner only" });
    expect(invoicesList).not.toHaveBeenCalled();
  });

  it("refuses when the signed-in user is not the owner found for the organization", async () => {
    const result = await listInvoicesForOrganization("org-1", "someone-else");
    expect(result).toMatchObject({ ok: false, error: "serverErrors.billing.ownerOnly" });
    expect(invoicesList).not.toHaveBeenCalled();
  });

  it("says there is no Stripe customer yet", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await listInvoicesForOrganization("org-1", "owner-1")).toMatchObject({ ok: false, error: "serverErrors.billing.noStripeCustomer" });
  });

  it("turns a Stripe failure into a plain message without internals", async () => {
    invoicesList.mockRejectedValue(new Error("secret internal detail"));
    const result = await listInvoicesForOrganization("org-1", "owner-1");
    expect(result).toEqual({ ok: false, error: "serverErrors.billing.invoicesFailed" });
  });
});
