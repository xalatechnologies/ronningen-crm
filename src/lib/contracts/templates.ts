"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { contractFrom } from "@/lib/contracts/db";
import {
  hashTemplateContent,
  templateInputSchema,
  type TemplateInput,
} from "@/lib/contracts/template-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TemplateResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const MAX_SIGNATURE_BYTES = 300 * 1024;

async function requireTemplateEditor(organizationId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "authentication_required" };
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = member?.role;
  if (role !== "owner" && role !== "admin" && role !== "manager") {
    return { ok: false as const, error: "forbidden" };
  }
  return { ok: true as const, supabase, user };
}

type VersionRow = {
  version_number: number;
  legal_terms: string;
  payment_terms: string;
  acceptance_declaration: string;
  closing_line: string | null;
  signer_name: string | null;
  signature_path: string | null;
};

export async function loadDefaultTemplate(organizationId: string): Promise<
  TemplateResult<{
    template: { templateId: string; versionNumber: number; fields: TemplateInput } | null;
  }>
> {
  const staff = await requireTemplateEditor(organizationId);
  if (!staff.ok) return staff;
  const { data: template } = await contractFrom(staff.supabase, "contract_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();
  if (!template) return { ok: true, template: null };
  const templateId = (template as { id: string }).id;
  const { data: version } = await contractFrom(staff.supabase, "contract_template_versions")
    .select(
      "version_number, legal_terms, payment_terms, acceptance_declaration, closing_line, signer_name, signature_path",
    )
    .eq("template_id", templateId)
    .eq("organization_id", organizationId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = version as VersionRow | null;
  if (!row) return { ok: true, template: null };
  return {
    ok: true,
    template: {
      templateId,
      versionNumber: row.version_number,
      fields: {
        legalTerms: row.legal_terms,
        paymentTerms: row.payment_terms,
        acceptanceDeclaration: row.acceptance_declaration,
        closingLine: row.closing_line,
        signerName: row.signer_name,
        signaturePath: row.signature_path,
      },
    },
  };
}

export async function saveTemplateVersion(
  input: { organizationId: string } & Record<string, unknown>,
): Promise<TemplateResult<{ versionNumber: number }>> {
  const staff = await requireTemplateEditor(input.organizationId);
  if (!staff.ok) return staff;
  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_template" };

  const { data: template } = await contractFrom(staff.supabase, "contract_templates")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("is_default", true)
    .maybeSingle();
  if (!template) return { ok: false, error: "no_template" };
  const templateId = (template as { id: string }).id;

  const { data: latest } = await contractFrom(staff.supabase, "contract_template_versions")
    .select("version_number")
    .eq("template_id", templateId)
    .eq("organization_id", input.organizationId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const versionNumber = ((latest as { version_number: number } | null)?.version_number ?? 0) + 1;

  const fields = parsed.data;
  const { error } = await contractFrom(staff.supabase, "contract_template_versions").insert({
    organization_id: input.organizationId,
    template_id: templateId,
    version_number: versionNumber,
    legal_terms: fields.legalTerms,
    payment_terms: fields.paymentTerms,
    acceptance_declaration: fields.acceptanceDeclaration,
    closing_line: fields.closingLine,
    signer_name: fields.signerName,
    signature_path: fields.signaturePath,
    content_hash: hashTemplateContent(fields),
    created_by: staff.user.id,
  } as never);
  if (error) {
    return { ok: false, error: error.code === "23505" ? "template_conflict" : error.message };
  }
  revalidatePath("/app/settings/kontrakter");
  return { ok: true, versionNumber };
}

function imageKind(bytes: Uint8Array): "png" | "jpg" | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return "png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return null;
}

export async function uploadSignature(formData: FormData): Promise<TemplateResult<{ path: string }>> {
  const organizationId = String(formData.get("organizationId") ?? "");
  const file = formData.get("file");
  const staff = await requireTemplateEditor(organizationId);
  if (!staff.ok) return staff;
  if (!(file instanceof File)) return { ok: false, error: "file_required" };
  if (file.size > MAX_SIGNATURE_BYTES) return { ok: false, error: "signature_too_large" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) return { ok: false, error: "signature_type" };
  const path = `${organizationId}/${randomUUID()}.${kind}`;
  const uploaded = await createSupabaseAdminClient()
    .storage.from("contract-signatures")
    .upload(path, Buffer.from(bytes), {
      contentType: kind === "png" ? "image/png" : "image/jpeg",
      upsert: false,
    });
  if (uploaded.error) return { ok: false, error: uploaded.error.message };
  return { ok: true, path };
}
