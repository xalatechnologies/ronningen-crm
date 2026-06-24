"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";
import {
  isSupportTicketCategory,
  type SupportTicketCategory,
} from "@/lib/support/labels";
import { requireOrgMember } from "@/lib/support/require-org-member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SUPPORT_PATH = "/app/settings/support";
const ADMIN_LAYOUT_PATH = "/admin";

function revalidateSupportSurfaces() {
  revalidatePath(SUPPORT_PATH);
  revalidatePath(adminRoutes.support);
  revalidatePath(ADMIN_LAYOUT_PATH, "layout");
}

export async function createOrgSupportTicket(input: {
  subject: string;
  body: string;
  category: SupportTicketCategory;
}) {
  const { userId, orgId } = await requireOrgMember();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (subject.length < 3) {
    return { ok: false as const, error: "Emne må være minst 3 tegn." };
  }
  if (body.length < 3) {
    return { ok: false as const, error: "Melding må være minst 3 tegn." };
  }
  if (!isSupportTicketCategory(input.category)) {
    return { ok: false as const, error: "Ugyldig kategori." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("platform_support_tickets")
    .insert({
      organization_id: orgId,
      subject,
      category: input.category,
      status: "open",
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (ticketError || !ticket) {
    return {
      ok: false as const,
      error: ticketError?.message ?? "Kunne ikke opprette sak.",
    };
  }

  const { error: noteError } = await supabase.from("platform_support_notes").insert({
    ticket_id: ticket.id,
    author_user_id: userId,
    body,
    is_internal: false,
  });

  if (noteError) {
    return { ok: false as const, error: noteError.message };
  }

  revalidateSupportSurfaces();
  return { ok: true as const, ticketId: ticket.id };
}

export async function replyToOrgSupportTicket(input: {
  ticketId: string;
  body: string;
}) {
  const { userId, orgId } = await requireOrgMember();
  const body = input.body.trim();

  if (body.length < 3) {
    return { ok: false as const, error: "Melding må være minst 3 tegn." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: ticket, error: fetchError } = await supabase
    .from("platform_support_tickets")
    .select("id, status, organization_id")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (fetchError) return { ok: false as const, error: fetchError.message };
  if (!ticket || ticket.organization_id !== orgId) {
    return { ok: false as const, error: "Sak ikke funnet." };
  }
  if (ticket.status === "resolved") {
    return { ok: false as const, error: "Saken er lukket og kan ikke besvares." };
  }

  const { error: noteError } = await supabase.from("platform_support_notes").insert({
    ticket_id: ticket.id,
    author_user_id: userId,
    body,
    is_internal: false,
  });

  if (noteError) return { ok: false as const, error: noteError.message };

  const admin = createSupabaseAdminClient();
  const nextStatus = ticket.status === "waiting" ? "open" : ticket.status;
  await admin
    .from("platform_support_tickets")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  revalidateSupportSurfaces();
  return { ok: true as const };
}
