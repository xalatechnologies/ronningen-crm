import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getDefaultT } from "@/lib/i18n/default-messages";

import { sendEmail } from "@/lib/notifications/email-client";
import {
  buildBillingActionUrl,
  type NotificationEventKey,
  type NotificationPriority,
} from "@/lib/notifications/notification-events";
import { notifyFromTemplate } from "@/lib/notifications/notify";
import {
  loadAndRenderTemplate,
  type TemplateVariables,
} from "@/lib/notifications/render-template";
import {
  getRecipientByUserId,
  listEligibleRecipients,
  listOrganizationOwnerRecipients,
} from "@/lib/notifications/recipients";

export type SendNotificationResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

const TEMPLATE_EVENT_MAP: Record<
  string,
  { eventKey: NotificationEventKey; priority?: NotificationPriority }
> = {
  welcome: { eventKey: "platform.welcome" },
  trial_reminder: { eventKey: "billing.trial_reminder" },
  payment_failed: { eventKey: "billing.payment_failed", priority: "high" },
};

async function claimSendSlot(input: {
  templateKey: string;
  recipientEmail: string;
  contextKey: string;
}): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("platform_notification_send_log").insert({
    template_key: input.templateKey,
    recipient_email: input.recipientEmail.toLowerCase(),
    context_key: input.contextKey,
  });

  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

async function recordDelivery(input: {
  campaignId?: string | null;
  recipientEmail: string;
  status: "sent" | "failed";
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("platform_notification_deliveries").insert({
    campaign_id: input.campaignId ?? null,
    recipient_email: input.recipientEmail,
    status: input.status,
  });

  if (error) throw error;
}

export async function sendNotificationToEmail(input: {
  email: string;
  userId?: string;
  templateKey: string;
  variables: TemplateVariables;
  contextKey: string;
  campaignId?: string | null;
  organizationId?: string | null;
  eventKey?: NotificationEventKey;
  priority?: NotificationPriority;
  actionUrl?: string | null;
  actionLabel?: string | null;
}): Promise<SendNotificationResult> {
  const email = input.email.trim();
  if (!email) return { ok: false, error: "Mangler e-postadresse" };

  const claimed = await claimSendSlot({
    templateKey: input.templateKey,
    recipientEmail: email,
    contextKey: input.contextKey,
  });

  if (!claimed) {
    return { ok: true, skipped: true };
  }

  const rendered = await loadAndRenderTemplate(input.templateKey, input.variables);
  if (!rendered) {
    return { ok: false, error: `Mal ikke funnet: ${input.templateKey}` };
  }

  const templateMeta = TEMPLATE_EVENT_MAP[input.templateKey];

  if (input.userId) {
    await notifyFromTemplate({
      userId: input.userId,
      templateKey: input.templateKey,
      variables: input.variables,
      contextKey: input.contextKey,
      campaignId: input.campaignId,
      organizationId: input.organizationId,
      eventKey: input.eventKey ?? templateMeta?.eventKey,
      priority: input.priority ?? templateMeta?.priority,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
    });
  }

  const result = await sendEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
  });

  await recordDelivery({
    campaignId: input.campaignId,
    recipientEmail: email,
    status: result.ok ? "sent" : "failed",
  });

  if (!result.ok) {
    return {
      ok: false,
      skipped: result.skipped,
      error: result.error,
    };
  }

  return { ok: true };
}

export async function sendNotificationToUser(input: {
  userId: string;
  templateKey: string;
  variables: TemplateVariables;
  contextKey: string;
  campaignId?: string | null;
  organizationId?: string | null;
  eventKey?: NotificationEventKey;
  priority?: NotificationPriority;
  actionUrl?: string | null;
  actionLabel?: string | null;
}): Promise<SendNotificationResult> {
  const recipient = await getRecipientByUserId(input.userId);
  if (!recipient) {
    return { ok: false, error: "Mottaker ikke funnet eller deaktivert" };
  }

  return sendNotificationToEmail({
    email: recipient.email,
    userId: input.userId,
    templateKey: input.templateKey,
    variables: {
      name: recipient.fullName ?? recipient.email,
      ...input.variables,
    },
    contextKey: input.contextKey,
    campaignId: input.campaignId,
    organizationId: input.organizationId,
    eventKey: input.eventKey,
    priority: input.priority,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
  });
}

export type BroadcastResult = {
  sent: number;
  failed: number;
  skipped: number;
};

export async function broadcastCampaign(
  campaignId: string,
): Promise<BroadcastResult> {
  const admin = createSupabaseAdminClient();

  const { data: campaign, error: campaignError } = await admin
    .from("platform_notification_campaigns")
    .select("id, name, template_key, status")
    .eq("id", campaignId)
    .maybeSingle();

  const t = getDefaultT();

  if (campaignError) throw campaignError;
  if (!campaign) throw new Error(t("serverErrors.admin.campaignNotFound"));
  if (campaign.status !== "active") {
    throw new Error(t("serverErrors.admin.campaignMustBeActiveForSend"));
  }
  if (!campaign.template_key) {
    throw new Error(t("serverErrors.admin.campaignMissingTemplate"));
  }

  const recipients = await listEligibleRecipients();
  const result: BroadcastResult = { sent: 0, failed: 0, skipped: 0 };

  for (const recipient of recipients) {
    const sendResult = await sendNotificationToEmail({
      email: recipient.email,
      userId: recipient.userId,
      templateKey: campaign.template_key,
      variables: { name: recipient.fullName ?? recipient.email },
      contextKey: `campaign:${campaignId}`,
      campaignId: campaign.id,
      eventKey: "platform.campaign",
      priority: "high",
    });

    if (sendResult.skipped) {
      result.skipped += 1;
    } else if (sendResult.ok) {
      result.sent += 1;
    } else {
      result.failed += 1;
    }
  }

  return result;
}

export async function sendWelcomeNotification(input: {
  userId: string;
  organizationName: string;
}): Promise<SendNotificationResult> {
  const t = getDefaultT();

  return sendNotificationToUser({
    userId: input.userId,
    templateKey: "welcome",
    variables: { organization: input.organizationName },
    contextKey: "welcome",
    eventKey: "platform.welcome",
    actionUrl: buildBillingActionUrl(),
    actionLabel: t("serverErrors.billing.completePayment"),
  });
}

export async function sendPaymentFailedNotifications(input: {
  organizationId: string;
  organizationName: string;
  invoiceId: string;
}): Promise<BroadcastResult> {
  const t = getDefaultT();
  const admin = createSupabaseAdminClient();
  const owners = await listOrganizationOwnerRecipients(input.organizationId);
  const result: BroadcastResult = { sent: 0, failed: 0, skipped: 0 };

  for (const owner of owners) {
    const sendResult = await sendNotificationToEmail({
      email: owner.email,
      userId: owner.userId,
      templateKey: "payment_failed",
      variables: {
        name: owner.fullName ?? owner.email,
        organization: input.organizationName,
      },
      contextKey: `payment_failed:${input.invoiceId}`,
      organizationId: input.organizationId,
      eventKey: "billing.payment_failed",
      priority: "high",
      actionUrl: buildBillingActionUrl(),
      actionLabel: t("serverErrors.billing.goToBilling"),
    });

    if (sendResult.skipped) result.skipped += 1;
    else if (sendResult.ok) result.sent += 1;
    else result.failed += 1;
  }

  if (owners.length === 0) {
    const { data: org } = await admin
      .from("organizations")
      .select("billing_email")
      .eq("id", input.organizationId)
      .maybeSingle();

    if (org?.billing_email) {
      const sendResult = await sendNotificationToEmail({
        email: org.billing_email,
        templateKey: "payment_failed",
        variables: { organization: input.organizationName },
        contextKey: `payment_failed:${input.invoiceId}`,
        organizationId: input.organizationId,
        eventKey: "billing.payment_failed",
        priority: "high",
        actionUrl: buildBillingActionUrl(),
        actionLabel: t("serverErrors.billing.goToBilling"),
      });
      if (sendResult.skipped) result.skipped += 1;
      else if (sendResult.ok) result.sent += 1;
      else result.failed += 1;
    }
  }

  return result;
}

export async function sendTrialReminders(): Promise<BroadcastResult> {
  const t = getDefaultT();
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const start = new Date(inThreeDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date(inThreeDays);
  end.setHours(23, 59, 59, 999);

  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("organization_id, current_period_end")
    .eq("status", "trialing")
    .gte("current_period_end", start.toISOString())
    .lte("current_period_end", end.toISOString());

  if (error) throw error;

  const result: BroadcastResult = { sent: 0, failed: 0, skipped: 0 };
  const dateKey = start.toISOString().slice(0, 10);

  for (const sub of subscriptions ?? []) {
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", sub.organization_id)
      .maybeSingle();

    const owners = await listOrganizationOwnerRecipients(sub.organization_id);
    const trialEndDate = sub.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString("nb-NO")
      : "";

    for (const owner of owners) {
      const sendResult = await sendNotificationToEmail({
        email: owner.email,
        userId: owner.userId,
        templateKey: "trial_reminder",
        variables: {
          name: owner.fullName ?? owner.email,
          organization: org?.name ?? "",
          trial_end_date: trialEndDate,
        },
        contextKey: `trial:${sub.organization_id}:${dateKey}`,
        organizationId: sub.organization_id,
        eventKey: "billing.trial_reminder",
        actionUrl: buildBillingActionUrl(),
        actionLabel: t("serverErrors.billing.goToBilling"),
      });

      if (sendResult.skipped) result.skipped += 1;
      else if (sendResult.ok) result.sent += 1;
      else result.failed += 1;
    }
  }

  return result;
}
