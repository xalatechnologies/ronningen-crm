"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit-log";
import type { CampaignStatus } from "@/lib/admin/notification-labels";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { broadcastCampaign } from "@/lib/notifications/send-platform-notification";

const CAMPAIGN_STATUSES = new Set<CampaignStatus>(["draft", "active", "paused"]);

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function upsertEmailTemplate(input: {
  key: string;
  subject: string;
  bodyHtml: string;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();
  const key = input.key.trim();

  if (!key) {
    return { ok: false as const, error: "Nøkkel er påkrevd" };
  }
  if (!input.subject.trim()) {
    return { ok: false as const, error: "Emne er påkrevd" };
  }
  if (!input.bodyHtml.trim()) {
    return { ok: false as const, error: "Innhold er påkrevd" };
  }

  const { data: before } = await admin
    .from("platform_email_templates")
    .select("key, subject, body_html")
    .eq("key", key)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error } = await admin.from("platform_email_templates").upsert(
    {
      key,
      subject: input.subject.trim(),
      body_html: input.bodyHtml,
      updated_at: now,
    },
    { onConflict: "key" },
  );

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "notification.template_upserted",
    targetType: "platform",
    targetId: key,
    metadata: {
      before: before ?? null,
      after: {
        key,
        subject: input.subject.trim(),
        body_html: input.bodyHtml,
      },
    },
  });

  revalidatePath("/admin/notifications");
  return { ok: true as const };
}

export async function createNotificationCampaign(input: {
  name: string;
  templateKey?: string | null;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();
  const name = input.name.trim();

  if (!name) {
    return { ok: false as const, error: "Navn er påkrevd" };
  }

  const { data, error } = await admin
    .from("platform_notification_campaigns")
    .insert({
      name,
      template_key: input.templateKey?.trim() || null,
      status: "draft",
    })
    .select("id, name, template_key, status")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "notification.campaign_created",
    targetType: "platform",
    targetId: data.id,
    metadata: { after: data },
  });

  revalidatePath("/admin/notifications");
  return { ok: true as const, campaignId: data.id };
}

export async function updateCampaignStatus(input: {
  campaignId: string;
  status: CampaignStatus;
}) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  if (!CAMPAIGN_STATUSES.has(input.status)) {
    return { ok: false as const, error: "Ugyldig kampanjestatus" };
  }

  const { data: before, error: fetchError } = await admin
    .from("platform_notification_campaigns")
    .select("id, name, template_key, status")
    .eq("id", input.campaignId)
    .maybeSingle();

  if (fetchError) return { ok: false as const, error: fetchError.message };
  if (!before) {
    return { ok: false as const, error: "Kampanje ikke funnet" };
  }

  if (input.status === "active" && !before.template_key) {
    return {
      ok: false as const,
      error: "Kampanjen må ha en mal før den kan aktiveres",
    };
  }

  const { error } = await admin
    .from("platform_notification_campaigns")
    .update({ status: input.status })
    .eq("id", input.campaignId);

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "notification.campaign_status_updated",
    targetType: "platform",
    targetId: input.campaignId,
    metadata: {
      before: { status: before.status },
      after: { status: input.status },
    },
  });

  revalidatePath("/admin/notifications");
  return { ok: true as const };
}

export async function sendNotificationCampaign(input: { campaignId: string }) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: campaign, error: fetchError } = await admin
    .from("platform_notification_campaigns")
    .select("id, name, template_key, status")
    .eq("id", input.campaignId)
    .maybeSingle();

  if (fetchError) return { ok: false as const, error: fetchError.message };
  if (!campaign) {
    return { ok: false as const, error: "Kampanje ikke funnet" };
  }
  if (campaign.status !== "active") {
    return {
      ok: false as const,
      error: "Kampanjen må være aktiv før utsending",
    };
  }
  if (!campaign.template_key) {
    return { ok: false as const, error: "Kampanjen mangler mal" };
  }

  try {
    const result = await broadcastCampaign(input.campaignId);

    await logAdminAction({
      actorUserId: adminUser.userId,
      action: "notification.campaign_sent",
      targetType: "platform",
      targetId: input.campaignId,
      metadata: {
        campaignName: campaign.name,
        templateKey: campaign.template_key,
        ...result,
      },
    });

    revalidatePath("/admin/notifications");
    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      error: formatActionError(error, "Utsending feilet"),
    };
  }
}
