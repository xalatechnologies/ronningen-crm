import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { FontKey, InviteDesign, PaletteKey, TemplateKey } from "./invite-rules";

type Client = SupabaseClient<Database>;

type Row = {
  template_key: TemplateKey;
  palette_key: PaletteKey;
  font_key: FontKey;
  headline: string;
  message: string;
  event_date_text: string;
  event_time_text: string;
  place_text: string;
  dress_code: string;
  rsvp_deadline: string | null;
  status: "draft" | "published";
  published_at: string | null;
};

/** The booking's saved invitation, or null if none yet. `client` is RLS-scoped (customer only). */
export async function getInviteDesign(client: Client, bookingId: string): Promise<InviteDesign | null> {
  const { data } = await client
    .from("portal_invite_designs" as never)
    .select(
      "template_key, palette_key, font_key, headline, message, event_date_text, event_time_text, place_text, dress_code, rsvp_deadline, status, published_at",
    )
    .eq("booking_id", bookingId)
    .maybeSingle();
  const r = data as unknown as Row | null;
  if (!r) return null;
  return {
    templateKey: r.template_key,
    paletteKey: r.palette_key,
    fontKey: r.font_key,
    headline: r.headline,
    message: r.message,
    eventDateText: r.event_date_text,
    eventTimeText: r.event_time_text,
    placeText: r.place_text,
    dressCode: r.dress_code,
    rsvpDeadline: r.rsvp_deadline,
    status: r.status,
    publishedAt: r.published_at,
  };
}
