import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type {
  NotificationCategory,
  NotificationPriority,
} from "@/lib/notifications/notification-events";
import type { Json } from "@/types/database.types";

export function stripHtmlForNotification(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function createUserNotification(input: {
  userId: string;
  title: string;
  body: string;
  contextKey: string;
  templateKey?: string | null;
  campaignId?: string | null;
  eventKey?: string | null;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  organizationId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ created: boolean }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("user_notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body,
    template_key: input.templateKey ?? null,
    campaign_id: input.campaignId ?? null,
    context_key: input.contextKey,
    event_key: input.eventKey ?? null,
    category: input.category ?? "platform",
    priority: input.priority ?? "normal",
    organization_id: input.organizationId ?? null,
    action_url: input.actionUrl ?? null,
    action_label: input.actionLabel ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });

  if (error?.code === "23505") return { created: false };
  if (error) throw error;
  return { created: true };
}
