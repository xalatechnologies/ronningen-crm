import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

const getContext = vi.fn();
vi.mock("@/lib/organizations/cached-organization-context", () => ({ getCachedServerOrganizationContext: () => getContext() }));

const updateMock = vi.fn();
const eqMock = vi.fn();
let updateError: { message: string } | null = null;
vi.mock("@/lib/supabase/cached-server-client", () => ({
  getCachedServerSupabaseClient: async () => ({
    from: (table: string) => ({
      update: (payload: unknown) => {
        updateMock(table, payload);
        return { eq: (column: string, value: unknown) => (eqMock(column, value), Promise.resolve({ error: updateError })) };
      },
    }),
  }),
}));

vi.mock("@/lib/i18n/server-messages", () => ({ getServerT: async () => (key: string) => key }));

import { updateOrganizationProfile } from "@/lib/organizations/actions/update-organization-profile";

const valid = {
  name: "  Rønningen Selskapslokale ",
  legalName: "Rønningen Gård og Event AS",
  tagline: "",
  orgNumber: "974 760 673",
  addressLine1: "Baneveien 290",
  addressLine2: "",
  postalCode: "3410",
  city: "Sylling",
  contactEmail: "post@lokale.no",
  contactPhone: "",
  logoUrl: "",
  bankAccount: "8601.11.17947",
  paymentInstructions: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  updateError = null;
  getContext.mockResolvedValue({ organizationId: "org-from-session", role: "owner" });
});

describe("updateOrganizationProfile", () => {
  it("saves a valid profile to the organization of the signed-in session, trimmed and with empty values as null", async () => {
    const result = await updateOrganizationProfile(valid);
    expect(result).toEqual({ ok: true });
    expect(eqMock).toHaveBeenCalledWith("id", "org-from-session");
    const [table, payload] = updateMock.mock.calls[0]!;
    expect(table).toBe("organizations");
    expect(payload).toMatchObject({ name: "Rønningen Selskapslokale", org_number: "974 760 673", tagline: null, logo_url: null, contact_phone: null });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("only ever writes the thirteen profile columns, even if extra fields are sent", async () => {
    await updateOrganizationProfile({ ...valid, billing_exempt: true, subscription_status: "active", id: "other-org", organization_id: "other-org" });
    const payload = updateMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      [
        "address_line1",
        "address_line2",
        "bank_account",
        "city",
        "contact_email",
        "contact_phone",
        "legal_name",
        "logo_url",
        "name",
        "org_number",
        "payment_instructions",
        "postal_code",
        "tagline",
      ].sort(),
    );
    expect(eqMock).toHaveBeenCalledWith("id", "org-from-session");
  });

  it("allows owners and admins and refuses every other role without writing", async () => {
    for (const role of ["owner", "admin"]) {
      getContext.mockResolvedValueOnce({ organizationId: "o", role });
      expect((await updateOrganizationProfile(valid)).ok).toBe(true);
    }
    updateMock.mockClear();
    for (const role of ["manager", "accountant", "viewer"]) {
      getContext.mockResolvedValueOnce({ organizationId: "o", role });
      expect((await updateOrganizationProfile(valid)).ok).toBe(false);
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("refuses when there is no active organization or role", async () => {
    getContext.mockResolvedValueOnce({ organizationId: null, role: null });
    expect((await updateOrganizationProfile(valid)).ok).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns the invalid fields and does not write when the input fails validation", async () => {
    const result = await updateOrganizationProfile({ ...valid, orgNumber: "974760674", postalCode: "34", logoUrl: "http://x.no/a.png" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["logoUrl", "orgNumber", "postalCode"]);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects input that is not an object at all", async () => {
    for (const bad of [null, undefined, "x", 42, []]) {
      expect((await updateOrganizationProfile(bad)).ok).toBe(false);
    }
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("reports a database error without revalidating", async () => {
    updateError = { message: "boom" };
    const result = await updateOrganizationProfile(valid);
    expect(result).toMatchObject({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
