import "server-only";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { guestIdForToken } from "./guest-tokens";
import type { DietTag, GuestStatus } from "./guest-rules";
import { deadlinePassed } from "./rsvp-rules";
import type { InviteDesign } from "./invite-rules";

export type PublicInvite = {
  guest: {
    id: string;
    name: string;
    maxParty: number;
    status: GuestStatus;
    partySize: number;
    diet: { label: string; tags: DietTag[]; note: string }[];
    optedOut: boolean;
  };
  design: Pick<InviteDesign, "templateKey" | "paletteKey" | "fontKey" | "headline" | "message" | "eventDateText" | "eventTimeText" | "placeText" | "dressCode" | "rsvpDeadline">;
  venueName: string;
  hostName: string;
  closed: boolean;
};

type GuestRow = {
  id: string;
  organization_id: string;
  booking_id: string;
  name: string;
  max_party: number;
  status: GuestStatus;
  party_size: number;
  diet: unknown;
  opted_out: boolean;
};

/**
 * Everything the guest page needs, or null for ANY failure (unknown link, deleted guest, unpublished
 * invitation): the page shows one generic message, so nothing can be probed. Service role, but it only
 * ever reads the single guest the link belongs to and that booking's published invitation.
 */
export async function loadPublicInvite(token: string): Promise<PublicInvite | null> {
  const admin = createSupabaseAdminClient();
  const guestId = await guestIdForToken(admin, token);
  if (!guestId) return null;

  const { data: g } = await admin
    .from("portal_guests" as never)
    .select("id, organization_id, booking_id, name, max_party, status, party_size, diet, opted_out")
    .eq("id", guestId)
    .maybeSingle();
  const guest = g as unknown as GuestRow | null;
  if (!guest) return null;

  const [{ data: d }, { data: org }, { data: booking }] = await Promise.all([
    admin
      .from("portal_invite_designs" as never)
      .select("template_key, palette_key, font_key, headline, message, event_date_text, event_time_text, place_text, dress_code, rsvp_deadline, status")
      .eq("booking_id", guest.booking_id)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", guest.organization_id).maybeSingle(),
    admin.from("bookings").select("customer_id").eq("id", guest.booking_id).maybeSingle(),
  ]);
  const design = d as unknown as
    | { template_key: InviteDesign["templateKey"]; palette_key: InviteDesign["paletteKey"]; font_key: InviteDesign["fontKey"]; headline: string; message: string; event_date_text: string; event_time_text: string; place_text: string; dress_code: string; rsvp_deadline: string | null; status: string }
    | null;
  if (!design || design.status !== "published") return null;

  const { data: customer } = booking?.customer_id
    ? await admin.from("customers").select("name").eq("id", booking.customer_id).maybeSingle()
    : { data: null };

  const diet = Array.isArray(guest.diet) ? (guest.diet as PublicInvite["guest"]["diet"]) : [];
  return {
    guest: { id: guest.id, name: guest.name, maxParty: guest.max_party, status: guest.status, partySize: guest.party_size, diet, optedOut: guest.opted_out },
    design: {
      templateKey: design.template_key,
      paletteKey: design.palette_key,
      fontKey: design.font_key,
      headline: design.headline,
      message: design.message,
      eventDateText: design.event_date_text,
      eventTimeText: design.event_time_text,
      placeText: design.place_text,
      dressCode: design.dress_code,
      rsvpDeadline: design.rsvp_deadline,
    },
    venueName: org?.name ?? "",
    hostName: customer?.name ?? "",
    closed: deadlinePassed(design.rsvp_deadline),
  };
}
