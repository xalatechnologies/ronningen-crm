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
  orgCustomers?: SupabaseResult<
    { id: string; name: string; email: string | null; phone: string | null }[]
  >;
  activityInsert?: SupabaseResult<null>;
  rpcResult?: {
    data: {
      customerId: string;
      reservationId: string;
      inquiryId?: string;
      reused: boolean;
    } | null;
    error: null | { message: string };
  };
};

const state: {
  config: BuilderConfig;
  inserts: Record<string, unknown[]>;
  rpcCalls: unknown[];
} = {
  config: {},
  inserts: {},
  rpcCalls: [],
};

function makeQueryChain(table: string) {
  const chain: Record<string, unknown> = {};

  const finalize = <T>(result: SupabaseResult<T>) => Promise.resolve(result);

  const asThenable = () => {
    if (table === "customers") {
      return finalize(state.config.orgCustomers ?? { data: [], error: null });
    }
    return finalize({ data: null, error: null });
  };

  chain.select = () => chain;
  chain.eq = () => chain;
  chain.then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => asThenable().then(resolve, reject);
  chain.maybeSingle = () => {
    if (table === "organizations") {
      return finalize(state.config.orgLookup ?? { data: null, error: null });
    }
    return finalize({ data: null, error: null });
  };

  return chain;
}

function makeInsertChain(table: string, row: unknown) {
  state.inserts[table] ??= [];
  state.inserts[table].push(row);

  return {
    then: (resolve: (v: SupabaseResult<null>) => unknown) => {
      if (table === "booking_inquiry_activities") {
        return resolve(
          state.config.activityInsert ?? { data: null, error: null },
        );
      }
      return resolve({ data: null, error: null });
    },
  };
}

const adminClient = {
  from(table: string) {
    return {
      select: () => makeQueryChain(table),
      insert: (row: unknown) => makeInsertChain(table, row),
    };
  },
  rpc(name: string, args: unknown) {
    state.rpcCalls.push({ name, args });
    if (name === "create_inquiry_atomic") {
      return Promise.resolve(
        state.config.rpcResult ?? {
          data: {
            customerId: "cust-1",
            reservationId: "inq-1",
            inquiryId: "inq-1",
            reused: false,
          },
          error: null,
        },
      );
    }
    return Promise.resolve({ data: null, error: { message: "unknown_rpc" } });
  },
};

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => adminClient,
}));

import { POST, findExistingInboundCustomer } from "@/app/api/inbound/inquiries/route";

const VALID_SECRET = "test-inbound-secret";

function buildRequest(
  body: unknown,
  options?: {
    secret?: string | null;
    useAuthHeader?: boolean;
    idempotencyKey?: string;
  },
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
  if (options?.idempotencyKey) {
    headers.set("idempotency-key", options.idempotencyKey);
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
      orgCustomers: { data: [], error: null },
      rpcResult: {
        data: {
          customerId: "cust-1",
          reservationId: "inq-1",
          inquiryId: "inq-1",
          reused: false,
        },
        error: null,
      },
    };
    state.inserts = {};
    state.rpcCalls = [];
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

  it("creates via create_inquiry_atomic and notifies members", async () => {
    const res = await POST(buildRequest(VALID_PAYLOAD));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({ ok: true, inquiryId: "inq-1", reused: false });

    expect(state.rpcCalls).toHaveLength(1);
    const call = state.rpcCalls[0] as {
      name: string;
      args: { payload: Record<string, unknown> };
    };
    expect(call.name).toBe("create_inquiry_atomic");
    expect(call.args.payload).toMatchObject({
      organization_id: "org-1",
      customer_name: "Ola Nordmann",
      customer_email: "ola@domene.no",
      event_type: "Privat",
      fest_type: "Bryllup",
      guest_count: 80,
      status: "new",
    });
    expect(call.args.payload.client_request_id).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    expect(String(call.args.payload.internal_notes)).toContain("[Kilde:");

    expect(notifyInquiryCreatedMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      inquiryId: "inq-1",
    });
  });

  it("passes existing customer_id when email matches", async () => {
    state.config.orgCustomers = {
      data: [
        {
          id: "cust-existing",
          name: "Ola Nordmann",
          email: "OLA@DOMENE.NO",
          phone: "90000000",
        },
      ],
      error: null,
    };
    const res = await POST(buildRequest(VALID_PAYLOAD));
    expect(res.status).toBe(201);
    const call = state.rpcCalls[0] as {
      args: { payload: Record<string, unknown> };
    };
    expect(call.args.payload.customer_id).toBe("cust-existing");
  });

  it("honors Idempotency-Key and skips notify on reused create", async () => {
    const key = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    state.config.rpcResult = {
      data: {
        customerId: "cust-1",
        reservationId: "inq-1",
        reused: true,
      },
      error: null,
    };
    const res = await POST(
      buildRequest(VALID_PAYLOAD, { idempotencyKey: key }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reused).toBe(true);
    const call = state.rpcCalls[0] as {
      args: { payload: Record<string, unknown> };
    };
    expect(call.args.payload.client_request_id).toBe(key);
    expect(notifyInquiryCreatedMock).not.toHaveBeenCalled();
    expect(state.inserts.booking_inquiry_activities).toBeUndefined();
  });

  it("does not attach on shared phone alone (name must match)", () => {
    const hit = findExistingInboundCustomer(
      [
        {
          id: "angelica",
          name: "Angelica Solbakken",
          email: "a@x.com",
          phone: "+4796665001",
        },
      ],
      { name: "Faisal", phone: "+47 966 65 001", email: null },
    );
    expect(hit).toBeNull();
  });

  it("attaches when phone and name both match", () => {
    const hit = findExistingInboundCustomer(
      [
        {
          id: "angelica",
          name: "Angelica Solbakken",
          email: "a@x.com",
          phone: "+4796665001",
        },
        {
          id: "faisal",
          name: "Faisal",
          email: null,
          phone: "96665001",
        },
      ],
      { name: "Faisal", phone: "+47 966 65 001", email: null },
    );
    expect(hit?.id).toBe("faisal");
  });
});
