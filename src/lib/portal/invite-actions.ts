"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "./context";
import { inviteDesignSchema, missingForPublish, type InviteDesignInput } from "./invite-rules";

export type InviteResult =
  | { ok: true; status: "draft" | "published" }
  | { ok: false; error: "invalid" | "forbidden" | "incomplete" | "failed"; missing?: ("headline" | "eventDateText")[] };

/**
 * Saves the invitation. mode: "draft" keeps it private, "publish" marks it ready (needs a headline and a
 * date), "unpublish" returns it to draft. The booking comes from the session; RLS and column grants and the
 * database's no-links check enforce the rest again.
 */
export async function saveInviteDesign(input: InviteDesignInput, mode: "draft" | "publish" | "unpublish"): Promise<InviteResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "forbidden" };
  const parsed = inviteDesignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;

  if (mode === "publish") {
    const missing = missingForPublish(d);
    if (missing.length > 0) return { ok: false, error: "incomplete", missing };
  }

  const status = mode === "publish" ? "published" : "draft";
  const now = new Date().toISOString();
  const fields = {
    template_key: d.templateKey,
    palette_key: d.paletteKey,
    font_key: d.fontKey,
    headline: d.headline,
    message: d.message,
    event_date_text: d.eventDateText,
    event_time_text: d.eventTimeText,
    place_text: d.placeText,
    dress_code: d.dressCode,
    rsvp_deadline: d.rsvpDeadline,
    status,
    published_at: status === "published" ? now : null,
    updated_by: ctx.userId,
  };

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("portal_invite_designs" as never)
    .select("id")
    .eq("booking_id", ctx.booking.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("portal_invite_designs" as never)
        .update({ ...fields, updated_at: now } as never)
        .eq("booking_id", ctx.booking.id)
    : await supabase
        .from("portal_invite_designs" as never)
        .insert({ ...fields, organization_id: ctx.organization.id, booking_id: ctx.booking.id } as never);
  if (error) return { ok: false, error: error.code === "23514" ? "invalid" : "failed" };

  revalidatePath("/portal", "layout");
  return { ok: true, status };
}
