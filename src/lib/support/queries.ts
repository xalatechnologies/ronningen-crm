import {
  isSupportTicketCategory,
  isSupportTicketStatus,
} from "@/lib/support/labels";
import type { OrgSupportOverview, OrgSupportTicket } from "@/lib/support/types";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function emptyOverview(): OrgSupportOverview {
  return { tickets: [], openCount: 0 };
}

export async function fetchOrgSupportOverview(
  orgId: string,
): Promise<OrgSupportOverview> {
  const supabase = await createServerSupabaseClient();

  const { data: tickets, error: ticketsError } = await supabase
    .from("platform_support_tickets")
    .select(
      "id, subject, category, status, created_at, updated_at, created_by_user_id",
    )
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  if (ticketsError) return emptyOverview();
  if (!tickets?.length) return emptyOverview();

  const ticketIds = tickets.map((t) => t.id);

  const { data: notes } = await supabase
    .from("platform_support_notes")
    .select("id, ticket_id, author_user_id, body, created_at")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: true });

  const authorIds = [...new Set((notes ?? []).map((n) => n.author_user_id))];

  const admin = createSupabaseAdminClient();
  const { data: profiles } =
    authorIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, is_platform_admin")
          .in("id", authorIds)
      : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name: p.full_name,
        isPlatformAdmin: p.is_platform_admin,
      },
    ]),
  );

  const messagesByTicket = new Map<string, OrgSupportTicket["messages"]>();
  for (const note of notes ?? []) {
    const author = profileById.get(note.author_user_id);
    const list = messagesByTicket.get(note.ticket_id) ?? [];
    list.push({
      id: note.id,
      body: note.body,
      authorName: author?.name ?? null,
      createdAt: note.created_at,
      isFromPlatform: author?.isPlatformAdmin ?? false,
    });
    messagesByTicket.set(note.ticket_id, list);
  }

  let openCount = 0;
  const rows: OrgSupportTicket[] = tickets.map((ticket) => {
    const status = isSupportTicketStatus(ticket.status)
      ? ticket.status
      : "open";
    const category = isSupportTicketCategory(ticket.category)
      ? ticket.category
      : "other";

    if (status === "open" || status === "waiting") openCount += 1;

    return {
      id: ticket.id,
      subject: ticket.subject,
      category,
      status,
      messages: messagesByTicket.get(ticket.id) ?? [],
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    };
  });

  return { tickets: rows, openCount };
}

export type AdminOrgSupportTicketSummary = {
  id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
};

export async function fetchAdminOrgSupportTickets(
  organizationId: string,
): Promise<AdminOrgSupportTicketSummary[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_support_tickets")
    .select("id, subject, category, status, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) return [];

  return (data ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status,
    updatedAt: t.updated_at,
  }));
}
