/**
 * One-off for Rønningen only: puts the agreement wording, closing line, signer name and
 * signature image that used to be hardcoded in the app onto Rønningen's own default contract
 * template (as a new template version). Needed because other organizations no longer inherit
 * these values and the app no longer substitutes Rønningen's text for a template's own text.
 *
 * Usage: env -u SUPABASE_SERVICE_ROLE_KEY node --env-file=.env.local scripts/backfill-ronningen-template-signature.mjs
 * Idempotent: skips when the latest version already has a signer name.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const RONNINGEN_ORG_ID = "890ce58d-8e54-4308-b967-e210ec6b2d32";
const CLOSING_LINE =
  "Rønningen sitt vertskap skal gjøre alt i vår makt for at deres dag blir den fineste av de alle!";
const SIGNER_NAME = "Hameed Rahmani";

// The agreement wording lives in a TypeScript template literal; read it from the source file.
const source = await readFile("src/lib/contracts/paper-copy.ts", "utf8");
const start = source.indexOf("DEFAULT_CONTRACT_LEGAL_TERMS = `");
const body = source.slice(start + "DEFAULT_CONTRACT_LEGAL_TERMS = `".length);
const LEGAL_TERMS = body.slice(0, body.indexOf("`;")).trim();
if (start < 0 || !LEGAL_TERMS.includes("4. Betingelser") || LEGAL_TERMS.includes("${")) {
  throw new Error("Could not read the default legal terms from paper-copy.ts");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: template, error } = await supabase
  .from("contract_templates")
  .select("id, organization_id, name")
  .eq("organization_id", RONNINGEN_ORG_ID)
  .eq("is_default", true)
  .maybeSingle();
if (error) throw error;
if (!template) throw new Error("No default template for Rønningen");

const { data: latest } = await supabase
  .from("contract_template_versions")
  .select("*")
  .eq("template_id", template.id)
  .order("version_number", { ascending: false })
  .limit(1)
  .maybeSingle();
if (!latest) throw new Error("Template has no versions");
if (latest.signer_name) {
  console.log(`skip: v${latest.version_number} already has a signer name`);
  process.exit(0);
}

const path = `${RONNINGEN_ORG_ID}/${randomUUID()}.png`;
const png = await readFile("public/contracts/utleier-signatur.png");
const up = await supabase.storage
  .from("contract-signatures")
  .upload(path, png, { contentType: "image/png", upsert: false });
if (up.error) throw up.error;

const paymentTerms = latest.payment_terms || "Merk betaling med: Arrangementsdato og navn";
const declaration =
  latest.acceptance_declaration ||
  "Jeg bekrefter å ha lest og forstått leieavtalen, informasjonsskrivet og ryddeplanen.";
const hash = createHash("sha256")
  .update(JSON.stringify([LEGAL_TERMS, paymentTerms, declaration, CLOSING_LINE, SIGNER_NAME, path]))
  .digest("hex");

const inserted = await supabase.from("contract_template_versions").insert({
  organization_id: RONNINGEN_ORG_ID,
  template_id: template.id,
  version_number: latest.version_number + 1,
  legal_terms: LEGAL_TERMS,
  payment_terms: paymentTerms,
  acceptance_declaration: declaration,
  closing_line: CLOSING_LINE,
  signer_name: SIGNER_NAME,
  signature_path: path,
  content_hash: hash,
});
if (inserted.error) throw inserted.error;
console.log(
  `backfilled Rønningen -> v${latest.version_number + 1} (${LEGAL_TERMS.length} characters of terms)`,
);
