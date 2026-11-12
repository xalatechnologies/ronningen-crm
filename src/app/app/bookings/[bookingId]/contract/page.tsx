import { notFound, redirect } from "next/navigation";

import { getCachedServerOrganizationContext } from "@/lib/organizations/cached-organization-context";
import { canManageBookings } from "@/lib/role-access";

import { ContractReviewWorkspace } from "@/components/contracts/contract-review-workspace";
import { requireServerOrganizationId } from "@/lib/organizations/require-server-organization-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contractFrom } from "@/lib/contracts/db";
import { contractOutOfSyncForBooking, previewContractDocument } from "@/lib/contracts/actions";
import { isEmailConfigured } from "@/lib/notifications/email-client";
import type { ContractStatus } from "@/lib/contracts/types";

export const dynamic = "force-dynamic";

export default async function ContractReviewPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = await createServerSupabaseClient();
  const orgId = await requireServerOrganizationId();
  // Review, edit and send are staff actions (owner/admin/manager), same as the server actions.
  const { role } = await getCachedServerOrganizationContext();
  if (!canManageBookings(role)) redirect("/app/bookings");

  const { data: contract } = await contractFrom(supabase, "rental_contracts")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!contract) notFound();

  const { data: versions } = await contractFrom(supabase, "rental_contract_versions")
    .select("id, version_number, status, processing_status, special_terms, include_internal_notes, customer_facing_notes")
    .eq("contract_id", (contract as { id: string }).id)
    .order("version_number", { ascending: false });

  const list = (versions ?? []) as {
    id: string;
    version_number: number;
    status: ContractStatus;
    processing_status: string;
    special_terms: string;
    include_internal_notes: boolean;
    customer_facing_notes: string | null;
  }[];
  const active = list[0];
  if (!active) notFound();

  const preview = await previewContractDocument({
    organizationId: orgId,
    bookingId,
    versionId: active.id,
  });

  const syncState =
    active.status === "sent" || active.status === "viewed" || active.status === "accepted"
      ? await contractOutOfSyncForBooking({ organizationId: orgId, bookingId })
      : null;

  const { data: inviteDelivery } = await contractFrom(supabase, "contract_email_deliveries")
    .select("status, last_error, to_email")
    .eq("version_id", active.id)
    .eq("template_key", "invite")
    .maybeSingle();

  const { data: acceptance } = await contractFrom(supabase, "contract_acceptances")
    .select("accepted_full_name, accepted_at")
    .eq("version_id", active.id)
    .maybeSingle();

  return (
    <ContractReviewWorkspace
      organizationId={orgId}
      bookingId={bookingId}
      versions={list}
      preview={preview.ok ? preview.document : null}
      contentHash={preview.ok ? preview.contentHash : null}
      emailConfigured={isEmailConfigured()}
      outOfSync={syncState?.ok ? syncState.outOfSync : false}
      inviteDelivery={
        inviteDelivery
          ? {
              status: (inviteDelivery as { status: string }).status,
              lastError: (inviteDelivery as { last_error: string | null }).last_error,
              toEmail: (inviteDelivery as { to_email: string }).to_email,
            }
          : null
      }
      acceptance={
        acceptance
          ? {
              fullName: (acceptance as { accepted_full_name: string }).accepted_full_name,
              acceptedAt: (acceptance as { accepted_at: string }).accepted_at,
            }
          : null
      }
    />
  );
}
