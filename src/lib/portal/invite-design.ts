import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { FlowerStyle, FlowerTone, FlowerType, FontKey, InviteDesign, PaletteKey, TemplateKey } from "./invite-rules";

type Client = SupabaseClient<Database>;

type Row = {
  template_key: TemplateKey;
  palette_key: PaletteKey;
  font_key: FontKey;
  flower_style: FlowerStyle;
  flower_type: FlowerType;
  flower_tone: FlowerTone;
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
  const COLUMNS = "template_key, palette_key, font_key, headline, message, event_date_text, event_time_text, place_text, dress_code, rsvp_deadline, status, published_at";
  const q = (cols: string) => client.from("portal_invite_designs" as never).select(cols).eq("booking_id", bookingId).maybeSingle();
  const withFlowers = await q(`${COLUMNS}, flower_style, flower_type, flower_tone`);
  // Without the flower columns (migration not applied yet) the card still loads, just without flowers.
  const { data } = withFlowers.error ? await q(COLUMNS) : withFlowers;
  const r = data as unknown as Row | null;
  if (!r) return null;
  return {
    templateKey: r.template_key,
    paletteKey: r.palette_key,
    fontKey: r.font_key,
    flowerStyle: r.flower_style ?? "none",
    flowerType: r.flower_type ?? "blomst",
    flowerTone: r.flower_tone ?? "accent",
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
