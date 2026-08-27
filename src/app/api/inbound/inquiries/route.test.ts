import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const notifyInquiryCreatedMock: (input: unknown) => Promise<void> = vi.fn(
  async () => undefined,
);
vi.mock("@/lib/notifications/actions/org-events", () => ({
  notifyInquiryCreated: (input: unknown) => notifyInquiryCreatedMock(input),
}));

type SupabaseResult<T> = { data: T; error: null | { message: string } };

type BuilderConfig = {
  orgLookup?: SupabaseResult<{ id: string } | null>;
  existingCustomer?: SupabaseResult<{ id: string } | null>;
  customerInsert?: SupabaseResult<{ id: string } | null>;
  inquiryInsert?: SupabaseResult<{ id: string } | null>;
  activityInsert?: SupabaseResult<null>;
};

const state: { config: BuilderConfig; inserts: Record<string, unknown[]> } = {
  config: {},
  inserts: {},
};

function makeQueryChain(table: string) {
  const chain: Record<string, unknown> = {};

  const finalize = <T>(result: SupabaseResult<T>) => Promise.resolve(result);

  chain.select = () => chain;
  chain.eq = () => chain;
  chain.or = () => chain;
  chain.limit = () => chain;
  chain.single = () => {
    if (table === "customers" && state.config.customerInsert) {
      const result = state.config.customerInsert;
      state.config.customerInsert = undefined;
      return finalize(result);
    }
    if (table === "booking_inquiries" && state.config.inquiryInsert) {
      return finalize(state.config.inquiryInsert);
    }
    return finalize({ data: null, error: null });
  };
  chain.maybeSingle = () => {
    if (table === "organizations") {
      return finalize(state.config.orgLookup ?? { data: null, error: null });
    }
    if (table === "customers") {
      return finalize(
        state.config.existingCustomer ?? { data: null, error: null },
      );
    }
    return finalize({ data: null, error: null });
  };

  return chain;
}

function makeInsertChain(table: string, row: unknown) {
  state.inserts[table] ??= [];
  state.inserts[table].push(row);

  const chain: Record<string, unknown> = {
    select: () => chain,
    single: () => {
      if (table === "customers") {
        return Promise.resolve(
          state.config.customerInsert ?? {
            data: { id: "cust-new" },
            error: null,
          },
        );
      }
      if (table === "booking_inquiries") {
        return Promise.resolve(
          state.config.inquiryInsert ?? {
            data: { id: "inq-new" },
            error: null,
          },
        );
      }
      return Promise.resolve({ data: null, error: null });
    },
    then: (resolve: (v: SupabaseResult<null>) => unknown) => {
      if (table === "booking_inquiry_activities") {
        return resolve(state.config.activityInsert ?? { data: null, error: null });
      }
      return resolve({ data: null, error: null });
    },
  };

  return chain;
}

const adminClient = {
  from(table: string) {
    return {
      select: () => makeQueryChain(table),
      insert: (row: unknown) => makeInsertChain(table, row),
    };
  },
};

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

import { POST } from "@/app/api/inbound/inquiries/route";

const VALID_SECRET = "test-inbound-secret";

function buildRequest(
  body: unknown,
  options?: { secret?: string | null; useAuthHeader?: boolean },
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  const secretToSend =
    options?.secret === undefined ? VALID_SECRET : options.secret;
  if (secretToSend !== null) {
    if (options?.useAuthHeader) {
      headers.set("authorization", `Bearer ${secretToSend}`);
    } else {
      headers.set("x-inbound-secret", secretToSend);
    }
  }
  return new Request("http://localhost/api/inbound/inquiries", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID_PAYLOAD = {
  organizationSlug: "ronningen",
  source: "website:ronningenselskapslokale.no",
  customer: {
    name: "Ola Nordmann",
    phone: "+47 900 00 000",
    email: "ola@domene.no",
    address: "Banegveien 290, 3410 Sylling",
  },
  inquiry: {
    eventType: "Privat",
    festType: "Bryllup",
    preferredEventDate: "2027-06-12",
    guestCount: 80,
  },
  message: "Kort om behov …",
} as const;

describe("POST /api/inbound/inquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INBOUND_INQUIRY_SECRET", VALID_SECRET);
    state.config = {
      orgLookup: { data: { id: "org-1" }, error: null },
      existingCustomer: { data: null, error: null },
      customerInsert: { data: { id: "cust-1" }, error: null },
      inquiryInsert: { data: { id: "inq-1" }, error: null },
    };
    state.inserts = {};
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when INBOUND_INQUIRY_SECRET is not configured", async () => {
    vi.unstubAllEnvs();
    const res = await POST(buildRequest(VALID_PAYLOAD));
    expect(res.status).toBe(503);
  });

  it("returns 401 without secret header", async () => {
    const res = await POST(buildRequest(VALID_PAYLOAD, { secret: null }));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await POST(buildRequest(VALID_PAYLOAD, { secret: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("accepts secret via Authorization: Bearer header", async () => {
    const res = await POST(buildRequest(VALID_PAYLOAD, { useAuthHeader: true }));
    expect(res.status).toBe(201);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(buildRequest("not-json"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid payload (missing customer name)", async () => {
    const res = await POST(
      buildRequest({
        ...VALID_PAYLOAD,
        customer: { ...VALID_PAYLOAD.customer, name: "" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown organizationSlug", async () => {
    state.config.orgLookup = { data: null, error: null };
    const res = await POST(buildRequest(VALID_PAYLOAD));
    expect(res.status).toBe(404);
  });

  it("creates a new customer and inquiry, and notifies members", async () => {
    const res = await POST(buildRequest(VALID_PAYLOAD));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ ok: true, inquiryId: "inq-1" });

    const customerRow = state.inserts.customers?.[0] as Record<string, unknown>;
    expect(customerRow).toMatchObject({
      name: "Ola Nordmann",
      phone: "+47 900 00 000",
      email: "ola@domene.no",
      organization_id: "org-1",
    });

    const inquiryRow = state.inserts.booking_inquiries?.[0] as Record<
      string,
      unknown
    >;
    expect(inquiryRow).toMatchObject({
      customer_id: "cust-1",
      organization_id: "org-1",
      status: "new",
      event_type: "Privat",
      fest_type: "Bryllup",
      preferred_event_date: "2027-06-12",
      guest_count: 80,
    });
    expect(inquiryRow.internal_notes).toContain("[Kilde:");
    expect(inquiryRow.internal_notes).toContain("Kort om behov");

    expect(notifyInquiryCreatedMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      inquiryId: "inq-1",
    });
  });

  it("reuses an existing customer matched by phone/email", async () => {
    state.config.existingCustomer = {
      data: { id: "cust-existing" },
      error: null,
    };
    const res = await POST(buildRequest(VALID_PAYLOAD));
    expect(res.status).toBe(201);
    expect(state.inserts.customers).toBeUndefined();
    const inquiryRow = state.inserts.booking_inquiries?.[0] as Record<
      string,
      unknown
    >;
    expect(inquiryRow.customer_id).toBe("cust-existing");
  });
});
