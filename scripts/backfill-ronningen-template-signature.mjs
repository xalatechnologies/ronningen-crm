/**
 * One-off: moves Rønningen's previously hardcoded closing line, signer name and signature image
 * onto Rønningen's own default contract template (as a new template version), so contracts
 * keep showing them now that other organizations no longer inherit them.
 *
 * Usage: env -u SUPABASE_SERVICE_ROLE_KEY node --env-file=.env.local scripts/backfill-ronningen-template-signature.mjs
 * Idempotent: skips templates whose latest version already has a signer name.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const CLOSING_LINE =
  "Rønningen sitt vertskap skal gjøre alt i vår makt for at deres dag blir den fineste av de alle!";
const SIGNER_NAME = "Hameed Rahmani";
const MARKER = "Rønningen har ingen refusjonsplikt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: templates, error } = await supabase
  .from("contract_templates")
  .select("id, organization_id, name")
  .eq("is_default", true);
if (error) throw error;

for (const template of templates) {
  const { data: latest } = await supabase
    .from("contract_template_versions")
    .select("*")
    .eq("template_id", template.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest || !latest.legal_terms.includes(MARKER) || latest.signer_name) {
    console.log(`skip ${template.organization_id} (${template.name})`);
    continue;
  }
  const path = `${template.organization_id}/${randomUUID()}.png`;
  const png = await readFile("public/contracts/utleier-signatur.png");
  const up = await supabase.storage
    .from("contract-signatures")
    .upload(path, png, { contentType: "image/png", upsert: false });
  if (up.error) throw up.error;
  const hash = createHash("sha256")
    .update(
      JSON.stringify([
        latest.legal_terms,
        latest.payment_terms,
        latest.acceptance_declaration,
        CLOSING_LINE,
        SIGNER_NAME,
        path,
      ]),
    )
    .digest("hex");
  const inserted = await supabase.from("contract_template_versions").insert({
    organization_id: latest.organization_id,
    template_id: template.id,
    version_number: latest.version_number + 1,
    legal_terms: latest.legal_terms,
    payment_terms: latest.payment_terms,
    acceptance_declaration: latest.acceptance_declaration,
    closing_line: CLOSING_LINE,
    signer_name: SIGNER_NAME,
    signature_path: path,
    content_hash: hash,
  });
  if (inserted.error) throw inserted.error;
  console.log(`backfilled ${template.organization_id} -> v${latest.version_number + 1}`);
}
