import { describe, expect, it, vi } from "vitest";

import {
  createAccommodationReservationAtomic,
  createBookingAtomic,
  createInquiryAtomic,
} from "./atomic-create";
import { hashOrgIdForLog } from "./create-logging";

function mockSupabaseRpc(impl: (name: string, args: unknown) => Promise<{ data: unknown; error: null | { message: string; code?: string } }>) {
  return {
    rpc: vi.fn(async (name: string, args: unknown) => impl(name, args)),
  } as never;
}

describe("hashOrgIdForLog", () => {
  it("does not echo the raw org id", () => {
    const orgId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const hashed = hashOrgIdForLog(orgId);
    expect(hashed).toMatch(/^org_[0-9a-f]{8}$/);
    expect(hashed).not.toContain(orgId);
  });
});

describe("createBookingAtomic", () => {
  it("returns same booking id on reused client_request_id", async () => {
    const requestId = "11111111-1111-4111-8111-111111111111";
    const supabase = mockSupabaseRpc(async () => ({
      data: {
        customerId: "cust-1",
        reservationId: "book-1",
        bookingId: "book-1",
        reused: true,
      },
      error: null,
    }));

    const first = await createBookingAtomic(supabase, {
      organization_id: "org-1",
      client_request_id: requestId,
    });
    const second = await createBookingAtomic(supabase, {
      organization_id: "org-1",
      client_request_id: requestId,
    });

    expect(first.reservationId).toBe("book-1");
    expect(second.reservationId).toBe(first.reservationId);
    expect(second.reused).toBe(true);
  });

  it("propagates rpc errors", async () => {
    const supabase = mockSupabaseRpc(async () => ({
      data: null,
      error: { message: "customer_org_mismatch", code: "P0001" },
    }));

    await expect(
      createBookingAtomic(supabase, {
        organization_id: "org-1",
        client_request_id: "22222222-2222-4222-8222-222222222222",
        customer_id: "other-org-customer",
      }),
    ).rejects.toMatchObject({ message: "customer_org_mismatch" });
  });

  it("surfaces inquiryConverted false from rpc payload", async () => {
    const supabase = mockSupabaseRpc(async () => ({
      data: {
        customerId: "cust-1",
        reservationId: "book-1",
        bookingId: "book-1",
        reused: false,
        inquiryConverted: false,
      },
      error: null,
    }));

    const result = await createBookingAtomic(supabase, {
      organization_id: "org-1",
      client_request_id: "77777777-7777-4777-8777-777777777777",
      inquiry_id: "inq-already-converted",
    });
    expect(result.inquiryConverted).toBe(false);
  });
});
describe("createInquiryAtomic", () => {
  it("treats concurrent same client_request_id as one logical create", async () => {
    let calls = 0;
    const supabase = mockSupabaseRpc(async () => {
      calls += 1;
      return {
        data: {
          customerId: "cust-1",
          reservationId: "inq-1",
          inquiryId: "inq-1",
          reused: calls > 1,
        },
        error: null,
      };
    });

    const [a, b] = await Promise.all([
      createInquiryAtomic(supabase, {
        organization_id: "org-1",
        client_request_id: "33333333-3333-4333-8333-333333333333",
      }),
      createInquiryAtomic(supabase, {
        organization_id: "org-1",
        client_request_id: "33333333-3333-4333-8333-333333333333",
      }),
    ]);

    expect(a.reservationId).toBe("inq-1");
    expect(b.reservationId).toBe("inq-1");
    expect(calls).toBe(2);
  });
});

describe("createAccommodationReservationAtomic", () => {
  it("parses reservationId from rpc payload", async () => {
    const supabase = mockSupabaseRpc(async () => ({
      data: {
        customerId: "cust-9",
        reservationId: "acc-9",
        reused: false,
      },
      error: null,
    }));

    const result = await createAccommodationReservationAtomic(supabase, {
      organization_id: "org-1",
      client_request_id: "44444444-4444-4444-8444-444444444444",
    });
    expect(result).toEqual({
      customerId: "cust-9",
      reservationId: "acc-9",
      reused: false,
    });
  });
});

describe("same display name different emails", () => {
  it("keeps separate bookings when names match but emails differ", async () => {
    const created: string[] = [];
    const supabase = mockSupabaseRpc(async (_name, args) => {
      const payload = (args as { payload: Record<string, unknown> }).payload;
      const email = String(payload.customer_email ?? "");
      const id = `book-${email}`;
      created.push(id);
      return {
        data: {
          customerId: `cust-${email}`,
          reservationId: id,
          reused: false,
        },
        error: null,
      };
    });

    const a = await createBookingAtomic(supabase, {
      organization_id: "org-1",
      client_request_id: "55555555-5555-4555-8555-555555555555",
      customer_name: "Same Name",
      customer_email: "one@example.com",
    });
    const b = await createBookingAtomic(supabase, {
      organization_id: "org-1",
      client_request_id: "66666666-6666-4666-8666-666666666666",
      customer_name: "Same Name",
      customer_email: "two@example.com",
    });

    expect(a.customerId).not.toBe(b.customerId);
    expect(a.reservationId).not.toBe(b.reservationId);
    expect(created).toHaveLength(2);
  });
});
