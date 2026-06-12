import {
  createUserNotification,
  stripHtmlForNotification,
} from "@/lib/notifications/create-user-notification";
import type {
  NotificationCategory,
  NotificationEventKey,
  NotificationPriority,
} from "@/lib/notifications/notification-events";
import { resolveEventDefaults } from "@/lib/notifications/notification-events";
import {
  loadAndRenderTemplate,
  type TemplateVariables,
} from "@/lib/notifications/render-template";
import {
  listOrgMembersByRoles,
  type NotificationRecipient,
} from "@/lib/notifications/recipients";

export type NotifyUserInput = {
  userId: string;
  title: string;
  body: string;
  contextKey: string;
  eventKey?: NotificationEventKey | string | null;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  organizationId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  templateKey?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function notifyUser(
  input: NotifyUserInput,
): Promise<{ created: boolean }> {
  const defaults = input.eventKey ? resolveEventDefaults(input.eventKey) : null;

  return createUserNotification({
    userId: input.userId,
    title: input.title,
    body: input.body,
    contextKey: input.contextKey,
    eventKey: input.eventKey ?? null,
    category: input.category ?? defaults?.category ?? "platform",
    priority: input.priority ?? defaults?.priority ?? "normal",
    organizationId: input.organizationId ?? null,
    actionUrl: input.actionUrl ?? null,
    actionLabel: input.actionLabel ?? null,
    templateKey: input.templateKey ?? null,
    campaignId: input.campaignId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function notifyOrgMembers(input: {
  organizationId: string;
  roles?: ("owner" | "admin")[];
  excludeUserId?: string;
  title: string;
  body: string;
  contextKey: string;
  eventKey: NotificationEventKey | string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  actionUrl?: string | null;
  actionLabel?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ notified: number; skipped: number }> {
  const members = await listOrgMembersByRoles(
    input.organizationId,
    input.roles ?? ["owner", "admin"],
  );

  let notified = 0;
  let skipped = 0;

  for (const member of members) {
    if (input.excludeUserId && member.userId === input.excludeUserId) continue;

    const result = await notifyUser({
      userId: member.userId,
      title: input.title,
      body: input.body,
      contextKey: `${input.contextKey}:${member.userId}`,
      eventKey: input.eventKey,
      organizationId: input.organizationId,
      category: input.category,
      priority: input.priority,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      metadata: input.metadata,
    });

    if (result.created) notified += 1;
    else skipped += 1;
  }

  return { notified, skipped };
}

export async function notifyFromTemplate(input: {
  userId: string;
  templateKey: string;
  variables: TemplateVariables;
  contextKey: string;
  eventKey?: NotificationEventKey | string | null;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  organizationId?: string | null;
  campaignId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
}): Promise<{ created: boolean } | null> {
  const rendered = await loadAndRenderTemplate(input.templateKey, input.variables);
  if (!rendered) return null;

  return notifyUser({
    userId: input.userId,
    title: rendered.subject,
    body: stripHtmlForNotification(rendered.html),
    contextKey: input.contextKey,
    eventKey: input.eventKey,
    category: input.category,
    priority: input.priority,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    templateKey: input.templateKey,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
  });
}

export async function notifyRecipientFromTemplate(input: {
  recipient: NotificationRecipient;
  templateKey: string;
  variables: TemplateVariables;
  contextKey: string;
  eventKey?: NotificationEventKey | string | null;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  organizationId?: string | null;
  campaignId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
}): Promise<{ created: boolean } | null> {
  return notifyFromTemplate({
    userId: input.recipient.userId,
    templateKey: input.templateKey,
    variables: {
      name: input.recipient.fullName ?? input.recipient.email,
      ...input.variables,
    },
    contextKey: input.contextKey,
    eventKey: input.eventKey,
    category: input.category,
    priority: input.priority,
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
  });
}
