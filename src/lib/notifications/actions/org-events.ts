"use server";

import {
  buildAccommodationActionUrl,
  buildBillingActionUrl,
  buildBookingActionUrl,
  buildInquiryActionUrl,
  buildTeamActionUrl,
} from "@/lib/notifications/notification-events";
import { notifyOrgMembers, notifyUser } from "@/lib/notifications/notify";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getServerT } from "@/lib/i18n/server-messages";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function notifyBookingCreated(input: {
  organizationId: string;
  bookingId: string;
  bookingReference?: string | null;
}) {
  const t = await getServerT();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const label = input.bookingReference?.trim() || input.bookingId.slice(0, 8);

  await notifyOrgMembers({
    organizationId: input.organizationId,
    excludeUserId: user?.id,
    eventKey: "booking.created",
    contextKey: `booking:${input.bookingId}`,
    title: t("serverErrors.notifications.newBooking"),
    body: t("serverErrors.notifications.newBookingBody", { label }),
    actionUrl: buildBookingActionUrl(input.bookingId),
    actionLabel: t("serverErrors.notifications.viewBooking"),
  });
}

export async function notifyInquiryCreated(input: {
  organizationId: string;
  inquiryId: string;
}) {
  const t = await getServerT();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await notifyOrgMembers({
    organizationId: input.organizationId,
    excludeUserId: user?.id,
    eventKey: "inquiry.created",
    contextKey: `inquiry:${input.inquiryId}`,
    title: t("serverErrors.notifications.newInquiry"),
    body: t("serverErrors.notifications.newInquiryBody"),
    actionUrl: buildInquiryActionUrl(input.inquiryId),
    actionLabel: t("serverErrors.notifications.viewInquiry"),
  });
}

export async function notifyAccommodationCreated(input: {
  organizationId: string;
  reservationId: string;
}) {
  const t = await getServerT();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await notifyOrgMembers({
    organizationId: input.organizationId,
    excludeUserId: user?.id,
    eventKey: "accommodation.created",
    contextKey: `accommodation:${input.reservationId}`,
    title: t("serverErrors.notifications.newAccommodation"),
    body: t("serverErrors.notifications.newAccommodationBody"),
    actionUrl: buildAccommodationActionUrl(input.reservationId),
    actionLabel: t("serverErrors.notifications.viewBooking"),
  });
}

export async function notifyTeamMemberAdded(input: {
  organizationId: string;
  userId: string;
}) {
  const t = await getServerT();
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  await notifyUser({
    userId: input.userId,
    organizationId: input.organizationId,
    eventKey: "team.member_added",
    contextKey: `team:${input.organizationId}:${input.userId}`,
    title: t("serverErrors.notifications.teamMemberAdded"),
    body: t("serverErrors.notifications.orgAccessGranted", {
      orgName: org?.name ?? t("serverErrors.notifications.defaultOrgName"),
    }),
    actionUrl: buildTeamActionUrl(),
    actionLabel: t("serverErrors.notifications.viewTeam"),
  });
}

export async function notifyBillingAccessSuspended(input: {
  organizationId: string;
  reason?: string | null;
}) {
  const t = await getServerT();
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const reasonText = input.reason?.trim()
    ? t("serverErrors.notifications.accessRestrictedReason", {
        reason: input.reason.trim(),
      })
    : "";

  await notifyOrgMembers({
    organizationId: input.organizationId,
    eventKey: "billing.access_suspended",
    contextKey: `billing_suspended:${input.organizationId}`,
    title: t("serverErrors.notifications.accessRestricted"),
    body: t("serverErrors.notifications.orgAccessRestricted", {
      orgName: org?.name ?? t("serverErrors.notifications.defaultOrgName"),
      reasonText,
    }),
    priority: "high",
    actionUrl: buildBillingActionUrl(),
    actionLabel: t("serverErrors.billing.goToBilling"),
  });
}

export async function notifySupportTicketReply(input: {
  ticketId: string;
  bodyPreview: string;
}) {
  const t = await getServerT();
  const admin = createSupabaseAdminClient();
  const { data: ticket } = await admin
    .from("platform_support_tickets")
    .select("id, subject, created_by_user_id, organization_id")
    .eq("id", input.ticketId)
    .maybeSingle();

  if (!ticket?.created_by_user_id) return;

  await notifyUser({
    userId: ticket.created_by_user_id,
    organizationId: ticket.organization_id,
    eventKey: "support.ticket_reply",
    contextKey: `support_reply:${input.ticketId}:${Date.now()}`,
    title: t("serverErrors.notifications.supportReplyTitle"),
    body: t("serverErrors.notifications.supportReplyPreview", {
      subject: ticket.subject,
      preview: input.bodyPreview.slice(0, 160),
    }),
    actionUrl: "/app/settings/support",
    actionLabel: t("serverErrors.notifications.openSupport"),
  });
}
