import { adminRoutes } from "@/config/admin-routes";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { readAdminSupportLastSeenAt } from "@/lib/admin/support-nav-badge-cookies";
import type { AdminSupportFilter } from "@/lib/admin/dashboard-links";
import {
  isSupportTicketCategory,
  isSupportTicketStatus,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/lib/support/labels";
import type { AdminQueueItem } from "@/lib/admin/types";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export type AdminSupportNote = {
  id: string;
  body: string;
  authorName: string | null;
  authorIsPlatformAdmin: boolean;
  isInternal: boolean;
  createdAt: string;
};

export type AdminSupportTicket = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  status: SupportTicketStatus;
  category: SupportTicketCategory;
  subject: string;
  noteCount: number;
  notes: AdminSupportNote[];
  assignedToName: string | null;
  createdByName: string | null;
  ticketSource: "tenant" | "admin" | "unknown";
  createdAt: string;
  updatedAt: string;
};

export type AdminSupportOverview = {
  tickets: AdminSupportTicket[];
  orgOptions: { id: string; name: string }[];
  openQueue: AdminQueueItem[];
  statusCounts: Record<AdminSupportFilter, number>;
};

function emptyOverview(): AdminSupportOverview {
  return {
    tickets: [],
    orgOptions: [],
    openQueue: [],
    statusCounts: { all: 0, open: 0, waiting: 0, resolved: 0 },
  };
}

/** Unseen open tickets since admin last visited Support — used for nav badge. */
export async function fetchAdminSupportNavBadgeCount(): Promise<number> {
  const admin = createSupabaseAdminClient();
  const lastSeenAt = await readAdminSupportLastSeenAt();

  let query = admin
    .from("platform_support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  if (lastSeenAt) {
    query = query.gt("updated_at", lastSeenAt);
  }

  const { count, error } = await query;

  if (error) return 0;
  return count ?? 0;
}

function resolveTicketSource(
  creator: { isPlatformAdmin: boolean } | null | undefined,
  notes: AdminSupportNote[],
): "tenant" | "admin" | "unknown" {
  if (creator) {
    return creator.isPlatformAdmin ? "admin" : "tenant";
  }

  const firstPublic = notes.find((note) => !note.isInternal);
  if (firstPublic) {
    return firstPublic.authorIsPlatformAdmin ? "admin" : "tenant";
  }

  return "unknown";
}

export async function fetchAdminSupportOverview(): Promise<AdminSupportOverview> {
  const admin = createSupabaseAdminClient();

  const [
    { data: tickets, error: ticketsError },
    { data: allOrgs },
    { data: notes },
  ] = await Promise.all([
    admin
      .from("platform_support_tickets")
      .select(
        "id, organization_id, status, category, subject, assigned_to, created_by_user_id, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(500),
    admin.from("organizations").select("id, name, slug").order("name"),
    admin
      .from("platform_support_notes")
      .select(
        "id, ticket_id, author_user_id, body, is_internal, created_at",
      )
      .order("created_at", { ascending: true }),
  ]);

  if (ticketsError) throw ticketsError;

  const orgById = new Map(
    (allOrgs ?? []).map((o) => [o.id, { name: o.name, slug: o.slug }] as const),
  );

  const authorIds = [
    ...new Set((notes ?? []).map((n) => n.author_user_id)),
    ...new Set(
      (tickets ?? [])
        .map((t) => t.assigned_to)
        .filter((id): id is string => Boolean(id)),
    ),
    ...new Set(
      (tickets ?? [])
        .map((t) => t.created_by_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

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

  const notesByTicket = new Map<string, AdminSupportNote[]>();
  for (const note of notes ?? []) {
    const author = profileById.get(note.author_user_id);
    const list = notesByTicket.get(note.ticket_id) ?? [];
    list.push({
      id: note.id,
      body: note.body,
      authorName: author?.name ?? null,
      authorIsPlatformAdmin: author?.isPlatformAdmin ?? false,
      isInternal: note.is_internal,
      createdAt: note.created_at,
    });
    notesByTicket.set(note.ticket_id, list);
  }

  const statusCounts: Record<AdminSupportFilter, number> = {
    all: 0,
    open: 0,
    waiting: 0,
    resolved: 0,
  };

  const rows: AdminSupportTicket[] = [];

  for (const ticket of tickets ?? []) {
    const status = isSupportTicketStatus(ticket.status)
      ? ticket.status
      : "open";
    const category = isSupportTicketCategory(ticket.category)
      ? ticket.category
      : "other";
    const org = orgById.get(ticket.organization_id);
    const ticketNotes = notesByTicket.get(ticket.id) ?? [];
    const creator = ticket.created_by_user_id
      ? profileById.get(ticket.created_by_user_id)
      : null;

    statusCounts.all += 1;
    statusCounts[status] += 1;

    rows.push({
      id: ticket.id,
      organizationId: ticket.organization_id,
      organizationName: org?.name ?? ticket.organization_id,
      organizationSlug: org?.slug ?? "—",
      status,
      category,
      subject: ticket.subject,
      noteCount: ticketNotes.length,
      notes: ticketNotes,
      assignedToName: ticket.assigned_to
        ? (profileById.get(ticket.assigned_to)?.name ?? null)
        : null,
      createdByName: creator?.name ?? null,
      ticketSource: resolveTicketSource(creator, ticketNotes),
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    });
  }

  const openQueue: AdminQueueItem[] = rows
    .filter((t) => t.status === "open")
    .sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    )
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      label: t.organizationName,
      sublabel: t.subject,
      href: adminRoutes.organizationDetail(t.organizationId),
      meta: format(new Date(t.updatedAt), "d. MMM yyyy", { locale: nb }),
    }));

  return {
    tickets: rows,
    orgOptions: (allOrgs ?? []).map((o) => ({ id: o.id, name: o.name })),
    openQueue,
    statusCounts,
  };
}
