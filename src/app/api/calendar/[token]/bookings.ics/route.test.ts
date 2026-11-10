import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SupabaseResult<T> = { data: T; error: null | { message: string } };

const state: {
  feedResult: SupabaseResult<
    | {
        id: string;
        organization_id: string;
        organizations: { name: string | null } | null;
      }
    | null
  >;
  bookingsResult: SupabaseResult<unknown[]>;
  lastAccessedUpdate: {
    ran: boolean;
    filterValue: string | null;
  };
} = {
  feedResult: { data: null, error: null },
  bookingsResult: { data: [], error: null },
  lastAccessedUpdate: { ran: false, filterValue: null },
};

function makeAdminClient() {
  return {
    from(table: string) {
      if (table === "organization_calendar_feeds") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: () => Promise.resolve(state.feedResult),
                };
              },
            };
          },
          update() {
            state.lastAccessedUpdate.ran = true;
            return {
              eq(_col: string, value: string) {
                state.lastAccessedUpdate.filterValue = value;
                return {
                  then: (
                    resolve: (v: SupabaseResult<null>) => unknown,
                  ) => resolve({ data: null, error: null }),
                };
              },
            };
          },
        };
      }
      if (table === "bookings") {
        return {
          select() {
            return {
              eq() {
                return {
                  order: () => Promise.resolve(state.bookingsResult),
                };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: () => makeAdminClient(),
}));

import { GET } from "@/app/api/calendar/[token]/bookings.ics/route";

const VALID_TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789_-";

function callRoute(token: string): Promise<Response> {
  return GET(
    new Request(`http://localhost/api/calendar/${token}/bookings.ics`),
    { params: Promise.resolve({ token }) },
  );
}

describe("GET /api/calendar/[token]/bookings.ics", () => {
  beforeEach(() => {
    state.feedResult = { data: null, error: null };
    state.bookingsResult = { data: [], error: null };
    state.lastAccessedUpdate = { ran: false, filterValue: null };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for a malformed token", async () => {
    const res = await callRoute("short");
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown token", async () => {
    state.feedResult = { data: null, error: null };
    const res = await callRoute(VALID_TOKEN);
    expect(res.status).toBe(404);
  });

  it("returns text/calendar for a valid token and empty bookings", async () => {
    state.feedResult = {
      data: {
        id: "feed-1",
        organization_id: "org-1",
        organizations: { name: "Rønningen" },
      },
      error: null,
    };
    state.bookingsResult = { data: [], error: null };

    const res = await callRoute(VALID_TOKEN);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("X-WR-CALNAME:Rønningen — Bookinger");
    expect(body).toContain("END:VCALENDAR");
  });

  it("serializes bookings into VEVENT blocks", async () => {
    state.feedResult = {
      data: {
        id: "feed-1",
        organization_id: "org-1",
        organizations: { name: "Test Org" },
      },
      error: null,
    };
    state.bookingsResult = {
      data: [
        {
          id: "b-1",
          event_type: "Bryllup",
          fest_type: null,
          event_date: "2026-09-01",
          event_end_date: null,
          event_start_time: "15:00",
          event_end_time: "23:00",
          guest_count: 60,
          status: "confirmed",
          notes: null,
          booking_reference: "RN-1",
          updated_at: "2026-08-27T12:00:00Z",
          customers: { name: "Kari" },
          properties: { name: "Hovedhus" },
        },
      ],
      error: null,
    };

    const res = await callRoute(VALID_TOKEN);
    const body = await res.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("UID:b-1@eventmanager.no");
    expect(body).toContain("DTSTART;TZID=Europe/Oslo:20260901T150000");
    expect(body).toContain("SUMMARY:Bryllup – Kari");
    expect(body).toContain("LOCATION:Hovedhus");
  });

  it("triggers a last_accessed_at update after a successful GET", async () => {
    state.feedResult = {
      data: {
        id: "feed-42",
        organization_id: "org-1",
        organizations: { name: "Test Org" },
      },
      error: null,
    };
    const res = await callRoute(VALID_TOKEN);
    expect(res.status).toBe(200);
    // Fire-and-forget: give the microtask queue a chance to drain.
    await new Promise((r) => setTimeout(r, 0));
    expect(state.lastAccessedUpdate.ran).toBe(true);
    expect(state.lastAccessedUpdate.filterValue).toBe("feed-42");
  });

  it("excludes cancelled bookings (English and Norwegian statuses)", async () => {
    state.feedResult = {
      data: {
        id: "feed-1",
        organization_id: "org-1",
        organizations: { name: "Test Org" },
      },
      error: null,
    };
    state.bookingsResult = {
      data: [
        {
          id: "b-active",
          event_type: "Bryllup",
          fest_type: null,
          event_date: "2026-09-01",
          event_end_date: null,
          event_start_time: "15:00",
          event_end_time: "23:00",
          guest_count: 60,
          status: "confirmed",
          notes: null,
          booking_reference: null,
          updated_at: "2026-08-27T12:00:00Z",
          customers: { name: "Kari" },
          properties: { name: "Hovedhus" },
        },
        {
          id: "b-cancelled-en",
          event_type: "Bryllup",
          fest_type: null,
          event_date: "2026-09-02",
          event_end_date: null,
          event_start_time: "15:00",
          event_end_time: "23:00",
          guest_count: 60,
          status: "cancelled",
          notes: null,
          booking_reference: null,
          updated_at: "2026-08-27T12:00:00Z",
          customers: { name: "Ola" },
          properties: { name: "Hovedhus" },
        },
        {
          id: "b-cancelled-nb",
          event_type: "Konfirmasjon",
          fest_type: null,
          event_date: "2026-09-03",
          event_end_date: null,
          event_start_time: "12:00",
          event_end_time: "18:00",
          guest_count: 30,
          status: "Avbestilt",
          notes: null,
          booking_reference: null,
          updated_at: "2026-08-27T12:00:00Z",
          customers: { name: "Per" },
          properties: { name: "Hovedhus" },
        },
      ],
      error: null,
    };

    const res = await callRoute(VALID_TOKEN);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("UID:b-active@eventmanager.no");
    expect(body).not.toContain("b-cancelled-en@eventmanager.no");
    expect(body).not.toContain("b-cancelled-nb@eventmanager.no");
    expect(body).not.toContain("STATUS:CANCELLED");
  });

  it("returns 404 when the bookings query errors", async () => {
    state.feedResult = {
      data: {
        id: "feed-1",
        organization_id: "org-1",
        organizations: { name: "Test Org" },
      },
      error: null,
    };
    state.bookingsResult = { data: [], error: { message: "boom" } };
    const res = await callRoute(VALID_TOKEN);
    expect(res.status).toBe(404);
  });
});
