import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { contractFrom } from "@/lib/contracts/db";
import { generateSecretToken, hashSecretToken } from "@/lib/contracts/crypto";
import { sendContractAcceptedEmail, sendContractInviteEmail } from "@/lib/contracts/mail";
import { buildAcceptedPdf } from "@/lib/contracts/pdf";
import type { FrozenContractDocument } from "@/lib/contracts/types";

type JobRow = {
  id: string;
  organization_id: string;
  version_id: string;
  job_type: string;
  unique_key: string;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
};

export async function processContractJobs(limit = 10): Promise<{
  processed: number;
  failed: number;
}> {
  const admin = createSupabaseAdminClient();
  const { data: jobs } = await contractFrom(admin, "contract_jobs")
    .select("*")
    .eq("status", "queued")
    .lte("run_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  let processed = 0;
  let failed = 0;
  for (const raw of jobs ?? []) {
    const job = raw as JobRow;
    const leaseUntil = new Date(Date.now() + 60_000).toISOString();
    const { data: leased } = await contractFrom(admin, "contract_jobs")
      .update({
        status: "leased",
        leased_until: leaseUntil,
        attempts: job.attempts + 1,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!leased) continue;

    try {
      if (job.job_type === "generate_pdf") {
        await ensureAcceptedPdf(job.version_id);
        await enqueueAcceptedEmail({
          organizationId: job.organization_id,
          versionId: job.version_id,
        });
      } else if (job.job_type === "email_invite") {
        await runInviteEmail(job);
      } else if (job.job_type === "email_accepted") {
        await runAcceptedEmail(job);
      }
      await contractFrom(admin, "contract_jobs")
        .update({
          status: "succeeded",
          updated_at: new Date().toISOString(),
          last_error: null,
        } as never)
        .eq("id", job.id);
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "job_failed";
      const giveUp = job.attempts + 1 >= job.max_attempts;
      await contractFrom(admin, "contract_jobs")
        .update({
          status: giveUp ? "failed" : "queued",
          run_after: new Date(Date.now() + 2 ** Math.min(job.attempts, 6) * 1000).toISOString(),
          last_error: message,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", job.id);
      failed += 1;
    }
  }
  return { processed, failed };
}

export async function ensureAcceptedPdf(versionId: string): Promise<{ storagePath: string }> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await contractFrom(admin, "contract_artifacts")
    .select("storage_path")
    .eq("version_id", versionId)
    .maybeSingle();
  if (existing) {
    return { storagePath: (existing as { storage_path: string }).storage_path };
  }

  const { data: version } = await contractFrom(admin, "rental_contract_versions")
    .select("frozen_document, organization_id, contract_id, status")
    .eq("id", versionId)
    .maybeSingle();
  const { data: acceptance } = await contractFrom(admin, "contract_acceptances")
    .select("accepted_at, accepted_full_name")
    .eq("version_id", versionId)
    .maybeSingle();
  const versionRow = version as {
    frozen_document: FrozenContractDocument;
    organization_id: string;
    contract_id: string;
    status: string;
  } | null;
  if (!versionRow || versionRow.status !== "accepted" || !acceptance) {
    throw new Error("acceptance_or_version_missing");
  }

  await contractFrom(admin, "rental_contract_versions")
    .update({ processing_status: "pdf_generating", updated_at: new Date().toISOString() } as never)
    .eq("id", versionId);

  const pdf = await buildAcceptedPdf({
    document: versionRow.frozen_document,
    acceptedAtIso: String((acceptance as { accepted_at: string }).accepted_at),
    acceptedFullName: String((acceptance as { accepted_full_name: string }).accepted_full_name),
  });

  const path = `${versionRow.organization_id}/${versionRow.contract_id}/${versionId}.pdf`;
  const uploaded = await admin.storage.from("contract-pdfs").upload(path, Buffer.from(pdf.bytes), {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploaded.error) {
    await contractFrom(admin, "rental_contract_versions")
      .update({ processing_status: "pdf_failed", updated_at: new Date().toISOString() } as never)
      .eq("id", versionId);
    throw uploaded.error;
  }

  const inserted = await contractFrom(admin, "contract_artifacts").insert({
    organization_id: versionRow.organization_id,
    version_id: versionId,
    storage_path: path,
    pdf_hash: pdf.pdfHash,
    byte_size: pdf.bytes.byteLength,
  } as never);
  if (inserted.error && !inserted.error.message.toLowerCase().includes("duplicate")) {
    throw inserted.error;
  }

  await contractFrom(admin, "rental_contract_versions")
    .update({ processing_status: "pdf_ready", updated_at: new Date().toISOString() } as never)
    .eq("id", versionId);

  return { storagePath: path };
}

async function enqueueAcceptedEmail(input: { organizationId: string; versionId: string }) {
  const admin = createSupabaseAdminClient();
  const { error } = await contractFrom(admin, "contract_jobs").insert({
    organization_id: input.organizationId,
    version_id: input.versionId,
    job_type: "email_accepted",
    unique_key: `email_accepted:${input.versionId}`,
    payload: {},
  } as never);
  if (error && error.code !== "23505" && !error.message.toLowerCase().includes("duplicate")) {
    throw error;
  }
}

export async function downloadAcceptedPdfBytes(versionId: string): Promise<Uint8Array> {
  const { storagePath } = await ensureAcceptedPdf(versionId);
  const admin = createSupabaseAdminClient();
  const downloaded = await admin.storage.from("contract-pdfs").download(storagePath);
  if (downloaded.error || !downloaded.data) throw new Error("pdf_download_failed");
  return new Uint8Array(await downloaded.data.arrayBuffer());
}

async function runInviteEmail(job: JobRow) {
  const admin = createSupabaseAdminClient();
  const { data: deliveries } = await contractFrom(admin, "contract_email_deliveries")
    .select("status")
    .eq("version_id", job.version_id)
    .eq("template_key", "invite")
    .in("status", ["provider_accepted", "delivered"]);
  if ((deliveries ?? []).length > 0) return;

  const { data: version } = await contractFrom(admin, "rental_contract_versions")
    .select("frozen_document, expires_at, status")
    .eq("id", job.version_id)
    .maybeSingle();
  const versionRow = version as unknown as {
    frozen_document: FrozenContractDocument;
    expires_at: string;
    status: string;
  } | null;
  const status = versionRow?.status;
  if (!versionRow || (status !== "sent" && status !== "viewed")) return;

  const raw = generateSecretToken();
  await contractFrom(admin, "contract_access_tokens")
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("version_id", job.version_id)
    .eq("purpose", "invite")
    .is("revoked_at", null);

  await contractFrom(admin, "contract_access_tokens").insert({
    organization_id: job.organization_id,
    version_id: job.version_id,
    token_hash: hashSecretToken(raw),
    purpose: "invite",
    expires_at: versionRow.expires_at,
  } as never);

  const doc = versionRow.frozen_document;
  const result = await sendContractInviteEmail({
    to: doc.customer.email ?? "",
    inviteToken: raw,
    organizationName: doc.issuer.legalName,
    versionId: job.version_id,
    venueName: doc.booking.venueName,
    bookingReference: doc.booking.reference,
  });
  await recordDelivery(job, "invite", doc.customer.email ?? "", result);
  if (!result.ok) throw new Error(result.error);
}

async function runAcceptedEmail(job: JobRow) {
  const admin = createSupabaseAdminClient();
  const { data: artifact } = await contractFrom(admin, "contract_artifacts")
    .select("storage_path")
    .eq("version_id", job.version_id)
    .maybeSingle();
  if (!artifact) throw new Error("artifact_missing");
  const path = (artifact as { storage_path: string }).storage_path;
  const downloaded = await admin.storage.from("contract-pdfs").download(path);
  if (downloaded.error || !downloaded.data) throw new Error("pdf_download_failed");
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const { data: version } = await contractFrom(admin, "rental_contract_versions")
    .select("frozen_document")
    .eq("id", job.version_id)
    .maybeSingle();
  const versionRow = version as unknown as {
    frozen_document: FrozenContractDocument;
  } | null;
  if (!versionRow) throw new Error("version_missing");
  const doc = versionRow.frozen_document;
  const result = await sendContractAcceptedEmail({
    to: doc.customer.email ?? "",
    organizationName: doc.issuer.legalName,
    pdfBytes: bytes,
    versionId: job.version_id,
  });
  await recordDelivery(job, "accepted", doc.customer.email ?? "", result);
  if (!result.ok) throw new Error(result.error);
}

async function recordDelivery(
  job: JobRow,
  templateKey: string,
  to: string,
  result: { ok: boolean; id?: string; error?: string; skipped?: boolean },
) {
  const admin = createSupabaseAdminClient();
  await contractFrom(admin, "contract_email_deliveries").upsert(
    {
      organization_id: job.organization_id,
      job_id: job.id,
      version_id: job.version_id,
      to_email: to,
      template_key: templateKey,
      idempotency_key: `${templateKey}:${job.version_id}:${to}`,
      provider_message_id: result.ok ? result.id ?? null : null,
      status: result.ok ? "provider_accepted" : "failed",
      last_error: result.ok ? null : result.error ?? "send_failed",
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "idempotency_key" },
  );
}
