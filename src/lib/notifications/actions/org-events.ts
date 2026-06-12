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
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function notifyBookingCreated(input: {
  organizationId: string;
  bookingId: string;
  bookingReference?: string | null;
}) {
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
    title: "Ny reservasjon",
    body: `En ny reservasjon (${label}) er registrert.`,
    actionUrl: buildBookingActionUrl(input.bookingId),
    actionLabel: "Se reservasjon",
  });
}

export async function notifyInquiryCreated(input: {
  organizationId: string;
  inquiryId: string;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await notifyOrgMembers({
    organizationId: input.organizationId,
    excludeUserId: user?.id,
    eventKey: "inquiry.created",
    contextKey: `inquiry:${input.inquiryId}`,
    title: "Ny forespørsel",
    body: "En ny forespørsel er registrert i systemet.",
    actionUrl: buildInquiryActionUrl(input.inquiryId),
    actionLabel: "Se forespørsel",
  });
}

export async function notifyAccommodationCreated(input: {
  organizationId: string;
  reservationId: string;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await notifyOrgMembers({
    organizationId: input.organizationId,
    excludeUserId: user?.id,
    eventKey: "accommodation.created",
    contextKey: `accommodation:${input.reservationId}`,
    title: "Ny overnatting",
    body: "En ny overnattingsreservasjon er registrert.",
    actionUrl: buildAccommodationActionUrl(input.reservationId),
    actionLabel: "Se reservasjon",
  });
}

export async function notifyTeamMemberAdded(input: {
  organizationId: string;
  userId: string;
}) {
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
    title: "Du er lagt til i et team",
    body: `Du har fått tilgang til ${org?.name ?? "organisasjonen"}.`,
    actionUrl: buildTeamActionUrl(),
    actionLabel: "Se team",
  });
}

export async function notifyBillingAccessSuspended(input: {
  organizationId: string;
  reason?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const reasonText = input.reason?.trim()
    ? ` Grunn: ${input.reason.trim()}`
    : "";

  await notifyOrgMembers({
    organizationId: input.organizationId,
    eventKey: "billing.access_suspended",
    contextKey: `billing_suspended:${input.organizationId}`,
    title: "Tilgang begrenset",
    body: `Tilgangen til ${org?.name ?? "organisasjonen"} er begrenset på grunn av abonnement.${reasonText}`,
    priority: "high",
    actionUrl: buildBillingActionUrl(),
    actionLabel: "Gå til fakturering",
  });
}

export async function notifySupportTicketReply(input: {
  ticketId: string;
  bodyPreview: string;
}) {
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
    title: "Svar på supportsak",
    body: `Nytt svar på «${ticket.subject}»: ${input.bodyPreview.slice(0, 160)}`,
    actionUrl: "/app/settings/support",
    actionLabel: "Åpne support",
  });
}
