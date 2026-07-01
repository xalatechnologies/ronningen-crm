"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import {
  isSupportTicketStatus,
  type SupportTicketStatus,
} from "@/lib/admin/support-labels";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { adminRoutes } from "@/config/admin-routes";
import { getServerTranslation } from "@/i18n/server";
import { notifySupportTicketReply } from "@/lib/notifications/actions/org-events";

export async function createSupportTicket(input: {
  organizationId: string;
  subject: string;
}) {
  const { t } = await getServerTranslation();
  const adminUser = await requirePlatformAdmin();
  const subject = input.subject.trim();

  if (subject.length < 3) {
    return { ok: false as const, error: t("serverErrors.admin.subjectMinLength") };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_support_tickets")
    .insert({
      organization_id: input.organizationId,
      subject,
      status: "open",
      created_by_user_id: adminUser.userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "support.ticket_created",
    targetType: "organization",
    targetId: input.organizationId,
    metadata: { ticketId: data.id, subject },
  });

  revalidatePath(adminRoutes.support);
  revalidatePath("/admin", "layout");
  revalidatePath("/app/settings/support");
  return { ok: true as const, ticketId: data.id };
}

export async function addSupportNote(input: {
  ticketId: string;
  body: string;
  isInternal?: boolean;
}) {
  const { t } = await getServerTranslation();
  const adminUser = await requirePlatformAdmin();
  const body = input.body.trim();
  const isInternal = input.isInternal ?? false;

  if (body.length < 3) {
    return { ok: false as const, error: t("serverErrors.admin.noteMinLength") };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("platform_support_notes").insert({
    ticket_id: input.ticketId,
    author_user_id: adminUser.userId,
    body,
    is_internal: isInternal,
  });

  if (error) return { ok: false as const, error: error.message };

  await admin
    .from("platform_support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.ticketId);

  revalidatePath(adminRoutes.support);
  if (!isInternal) revalidatePath("/app/settings/support");

  if (!isInternal) {
    try {
      await notifySupportTicketReply({
        ticketId: input.ticketId,
        bodyPreview: body,
      });
    } catch (error) {
      console.warn("[notifications] Kunne ikke varsle om supportsvar.", error);
    }
  }

  return { ok: true as const };
}

export async function updateSupportTicketStatus(input: {
  ticketId: string;
  status: SupportTicketStatus;
}) {
  const adminUser = await requirePlatformAdmin();

  if (!isSupportTicketStatus(input.status)) {
    return { ok: false as const, error: "Ugyldig status." };
  }

  const admin = createSupabaseAdminClient();
  const { data: before, error: fetchError } = await admin
    .from("platform_support_tickets")
    .select("id, organization_id, status, subject")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (fetchError) return { ok: false as const, error: fetchError.message };
  if (!before) return { ok: false as const, error: "Sak ikke funnet." };
  if (before.status === input.status) {
    return { ok: true as const };
  }

  const { error } = await admin
    .from("platform_support_tickets")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.ticketId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "support.ticket_status_updated",
    targetType: "organization",
    targetId: before.organization_id,
    metadata: {
      ticketId: before.id,
      subject: before.subject,
      before: { status: before.status },
      after: { status: input.status },
    },
  });

  revalidatePath(adminRoutes.support);
  revalidatePath("/admin", "layout");
  revalidatePath("/app/settings/support");
  return { ok: true as const };
}
