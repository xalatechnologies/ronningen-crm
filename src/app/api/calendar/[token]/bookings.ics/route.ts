import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { buildBookingsIcs, type IcsBookingEvent } from "@/lib/calendar/ics-generator";
import { isValidFeedTokenShape } from "@/lib/calendar/feed-tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Standard 404 body — keep it terse so scanners can't distinguish
// "unknown token" from "malformed token".
function notFound(): Response {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

type CustomerRel = { name: string | null } | { name: string | null }[] | null;
type PropertyRel = { name: string | null } | { name: string | null }[] | null;

type BookingRowFromDb = {
  id: string;
  event_type: string;
  fest_type: string | null;
  event_date: string;
  event_end_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  guest_count: number | null;
  status: string;
  notes: string | null;
  booking_reference: string | null;
  updated_at: string;
  customers: CustomerRel;
  properties: PropertyRel;
};

function pickName(rel: CustomerRel | PropertyRel): string | null {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name ?? null;
}

/**
 * Cancelled bookings are excluded from the feed entirely — RFC 5545 says
 * we should send them with `STATUS:CANCELLED`, but real-world booking-sync
 * consumers (Digilist, and many home-grown calendar parsers) ignore the
 * status field and still treat the timeslot as busy. Silently dropping the
 * row is equivalent to "this booking no longer exists", which matches
 * user intent for availability sync.
 */
function isCancelledStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === "cancelled" || normalized === "avbestilt";
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params;

  if (!token || !isValidFeedTokenShape(token)) {
    return notFound();
  }

  const admin = createSupabaseAdminClient();

  const { data: feed, error: feedErr } = await admin
    .from("organization_calendar_feeds")
    .select("id, organization_id, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  if (feedErr) {
    console.error("[api/calendar] feed lookup failed", feedErr);
    return notFound();
  }
  if (!feed) return notFound();

  const orgName =
    (Array.isArray(feed.organizations) ? feed.organizations[0]?.name : feed.organizations?.name) ||
    "Bookinger";

  const { data: rows, error: bookingsErr } = await admin
    .from("bookings")
    .select(
      "id, event_type, fest_type, event_date, event_end_date, event_start_time, event_end_time, guest_count, status, notes, booking_reference, updated_at, customers(name), properties(name)",
    )
    .eq("organization_id", feed.organization_id)
    .order("event_date", { ascending: true });

  if (bookingsErr) {
    console.error("[api/calendar] bookings fetch failed", bookingsErr);
    return notFound();
  }

  const events: IcsBookingEvent[] = ((rows as BookingRowFromDb[] | null) ?? [])
    .filter((row) => !isCancelledStatus(row.status))
    .map((row) => ({
      id: row.id,
      bookingReference: row.booking_reference,
      customerName: pickName(row.customers),
      propertyName: pickName(row.properties),
      eventType: row.event_type,
      festType: row.fest_type,
      eventDate: row.event_date,
      eventEndDate: row.event_end_date,
      eventStartTime: row.event_start_time,
      eventEndTime: row.event_end_time,
      guestCount: row.guest_count ?? 0,
      notes: row.notes,
      status: row.status,
      updatedAt: row.updated_at,
    }));

  const ics = buildBookingsIcs({
    calendarName: `${orgName} — Bookinger`,
    productId: "-//EventManager//Bookings 1.0//EN",
    organizationId: feed.organization_id,
    events,
  });

  // Fire-and-forget access-timestamp update so owners can see whether the
  // feed is actually being polled. Never blocks the response, never leaks.
  void admin
    .from("organization_calendar_feeds")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", feed.id)
    .then((result) => {
      if (result.error) {
        console.warn(
          "[api/calendar] last_accessed_at update failed (non-fatal)",
          result.error,
        );
      }
    });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="bookings.ics"',
      // Poll-friendly caching: consumers refresh every few minutes anyway.
      "cache-control": "no-store, max-age=0",
    },
  });
}
