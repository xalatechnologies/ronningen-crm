# Standard Contract Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each organization edits its own standard rental agreement in one place; new contracts and unsent drafts follow it, with an optional template per package.

**Architecture:** Reuse `contract_templates` / `contract_template_versions`. Add three versioned fields (closing line, signer name, signature image path) to template versions and carry them into the frozen document's `terms` with fallbacks to today's constants, so old frozen documents render unchanged. Drafts resolve the latest template version at compose time; sent/accepted versions keep their frozen document. Package variants (Step 2) add `packages.contract_template_id`.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before writing Next code), Supabase (Postgres RPC + RLS + storage), vitest, pdf-lib, TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-02-standard-contract-template-design.md`

## Global Constraints

- Sent, viewed and accepted contracts are never changed by a template edit.
- Template versions are immutable; saving creates a new version (`version_number + 1`, new `content_hash`).
- Editing the template requires role owner/admin/manager (existing RLS `has_org_role`).
- New fields on `FrozenContractDocument["terms"]` are optional; old frozen documents must render exactly as before (fallback to `CONTRACT_CLOSING_LINE`, `LESSOR_SIGNATURE_NAME`, `LESSOR_SIGNATURE_SRC`).
- No Rønningen name, person or wording in the neutral starter template.
- Migrations are applied by hand to the shared Supabase project; each task with a migration ends by telling the user to apply it and verifying via REST.
- UI strings go through `src/i18n/dictionaries/parts/contracts.ts` (nb + en).
- Production deploys from `feature/saas-multi-tenant`: commit per task, push only after the user says so.

## Review Focus

- Saving a template with empty legal terms: must be rejected, never produce a contract with no terms.
- Signature upload that is not a PNG/JPEG or is over 300 KB: rejected with a clear message.
- A draft that has a per-contract `document_overrides["terms.legalTerms"]`: the override still wins over the new standard (per-contract exception).
- Two admins saving the template at once: second save gets the next version number or a clear conflict, never a duplicate version number.
- Closing line / signer name containing `<`, `&` or newlines: rendered as plain text in the view and PDF.
- Booking with several packages: the template of the primary package line is used (Step 2).

---

## Step 1: Standard template editor

### Task 1: Database fields, neutral starter seed, signature bucket

**Files:**
- Create: `supabase/migrations/20261102160000_template_signature_and_starter.sql`

**Interfaces:**
- Produces: columns `contract_template_versions.closing_line text`, `.signer_name text`, `.signature_path text` (all nullable); RPC `public.seed_starter_contract_template(p_org uuid) returns uuid` (neutral Norwegian wording, creates default template + version 1, idempotent like `seed_default_contract_template`); public storage bucket `contract-signatures`.

- [ ] **Step 1: Write the migration.** Immutability trigger on template versions only blocks UPDATE/DELETE, so adding columns is safe. The starter seed mirrors `seed_default_contract_template` (see `20261003180000_ronningen_contract_template_v2.sql`) with generic text (no organization name) and `signer_name` null.
- [ ] **Step 2: Ask the user to apply it**, then verify: `curl` the REST endpoint with the publishable key selecting `closing_line,signer_name,signature_path` from `contract_template_versions` returns `[]` or rows with no error; anonymous RPC call returns `42501`.
- [ ] **Step 3: Commit** `feat(contracts): template version fields and neutral starter seed`.

### Task 2: Frozen document fields and layout helpers

**Files:**
- Modify: `src/lib/contracts/types.ts` (terms: `closingLine?: string | null; signerName?: string | null; signaturePath?: string | null`)
- Modify: `src/lib/contracts/layout.ts`
- Test: `src/lib/contracts/layout.test.ts`

**Interfaces:**
- Produces in `layout.ts`: `contractClosingLine(doc: FrozenContractDocument): string`, `contractSignerName(doc: FrozenContractDocument): string`, `contractSignatureUrl(doc: FrozenContractDocument): string` — each falls back to the existing constant when the term is empty/missing.

- [ ] **Step 1: Failing tests** in `layout.test.ts`: `contractClosingLine` returns the constant for a document without `terms.closingLine`, returns the custom value when set, trims whitespace; `contractSignerName` same with `LESSOR_SIGNATURE_NAME`; `contractSignatureUrl` returns `LESSOR_SIGNATURE_SRC` when `signaturePath` is null and `/api/contracts/signature?path=<encoded>` when set.
- [ ] **Step 2: Run** `npx vitest run src/lib/contracts/layout.test.ts` → FAIL (functions missing).
- [ ] **Step 3: Implement** the three helpers and the optional type fields.
- [ ] **Step 4: Run** → PASS. **Commit** `feat(contracts): closing line, signer and signature on the document terms`.

### Task 3: Compose pulls template fields and drafts follow the latest version

**Files:**
- Modify: `src/lib/contracts/compose.ts` (new pure helper), `src/lib/contracts/actions.ts` (`composeVersionDocument`)
- Test: `src/lib/contracts/compose.test.ts` (create)

**Interfaces:**
- Produces: `pickTemplateVersionId(input: { status: string; pinnedVersionId: string | null; latestVersionId: string | null }): string | null` — returns `latestVersionId ?? pinnedVersionId` when `status === "draft"`, otherwise `pinnedVersionId`.

- [ ] **Step 1: Failing tests** for `pickTemplateVersionId`: draft with newer latest → latest; sent with newer latest → pinned; draft with no latest → pinned; both null → null.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the helper; in `composeVersionDocument` select `template_id`, look up the latest `contract_template_versions` row for that template (`order version_number desc limit 1`), use `pickTemplateVersionId`, and read `legal_terms, payment_terms, acceptance_declaration, closing_line, signer_name, signature_path` into `terms`. Existing `document_overrides` application stays last so a per-contract override of `terms.legalTerms` still wins.
- [ ] **Step 4: Run** `npx vitest run src/lib/contracts` → PASS; `npx tsc --noEmit` clean. **Commit.**

### Task 4: Document view and PDF use the helpers

**Files:**
- Modify: `src/components/contracts/contract-document-view.tsx` (signature block, closing line), `src/lib/contracts/pdf.ts` (`loadLessorSignaturePng`, signer name, closing line)
- Create: `src/app/api/contracts/signature/route.ts`

**Interfaces:**
- Consumes: `contractClosingLine`, `contractSignerName`, `contractSignatureUrl` (Task 2).
- Produces: `GET /api/contracts/signature?path=` streams the image from bucket `contract-signatures`; 404 on bad path (path must match `^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg)$`).

- [ ] **Step 1:** Replace direct constant use in the view and PDF with the helpers. `loadLessorSignaturePng` becomes `loadLessorSignatureImage(doc): Promise<{ bytes: Uint8Array; kind: "png" | "jpg" }>` — fetches the stored image when `signaturePath` is set, else reads `public/contracts/utleier-signatur.png` as today.
- [ ] **Step 2: Verify** with the existing draft PDF route: `GET /api/contracts/staff-pdf?...` for the Rønningen draft returns 200 and still shows "Hameed Rahmani" (fallback). Render check in the browser pane on the contract page.
- [ ] **Step 3: Commit.**

### Task 5: Template server actions with validation

**Files:**
- Create: `src/lib/contracts/templates.ts` (`"use server"`)
- Test: `src/lib/contracts/templates.test.ts`

**Interfaces:**
- Produces: `templateInputSchema` (zod): `legalTerms` non-empty trimmed ≤ 60000 chars, `paymentTerms` ≤ 2000, `acceptanceDeclaration` non-empty ≤ 1000, `closingLine` ≤ 300, `signerName` ≤ 120 (control characters stripped), `signaturePath` nullable; `hashTemplateContent(input: TemplateInput): string` (sha256 hex of stable JSON); `loadDefaultTemplate(organizationId: string): Promise<ActionResult<{ templateId: string; versionNumber: number; fields: TemplateInput } | { templateId: null }>>`; `saveTemplateVersion(input: { organizationId: string } & TemplateInput): Promise<ActionResult<{ versionNumber: number }>>` (inserts `version_number = max + 1`; unique-violation → returns `{ ok: false, error: "template_conflict" }`); `uploadSignature(formData: FormData): Promise<ActionResult<{ path: string }>>` (PNG/JPEG only, ≤ 300 KB, stored under `{orgId}/{uuid}.png|jpg`).

- [ ] **Step 1: Failing tests** for the schema (empty legal terms rejected; 60001 chars rejected; control chars stripped from signer name) and `hashTemplateContent` (same input same hash, any field change changes hash).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** Role check reuses the pattern in `requireStaff` (owner/admin/manager). **Step 4: Run** → PASS. **Commit.**

### Task 6: Template editor on the contract settings page

**Files:**
- Create: `src/components/contracts/contract-template-editor.tsx`
- Modify: `src/app/app/settings/kontrakter/page.tsx`, `src/i18n/dictionaries/parts/contracts.ts`

**Interfaces:**
- Consumes: `loadDefaultTemplate`, `saveTemplateVersion`, `uploadSignature` (Task 5).

- [ ] **Step 1:** Editor card under the existing settings form: textareas for legal terms, payment terms, declaration; inputs for closing line and signer name; signature file input with preview; "Lagre ny versjon" button; shows "Versjon N" and a note "Gjelder nye avtaler og usendte utkast. Sendte og signerte avtaler endres ikke." Cancel discards local changes (same pattern as the contract editor: no persistence before Lagre).
- [ ] **Step 2: Verify in the browser pane:** edit legal terms, save, reload (persisted, version incremented); open an unsent draft and confirm it shows the new text; confirm a sent/accepted contract's PDF is unchanged.
- [ ] **Step 3: Commit.**

### Task 7: Link from the packages overview

**Files:**
- Modify: `src/components/pricing/pricing-section.tsx` (or the pricing page header), `src/i18n/dictionaries/parts/contracts.ts`

- [ ] **Step 1:** Add a visible card/link "Standard leieavtale" with template name, current version number and an "Rediger" link to `/app/settings/kontrakter#mal`. **Step 2: Verify** in the browser pane that it is reachable from `/app/pricing`. **Commit.**

### Task 8: Neutral starter template for new organizations

**Files:**
- Modify: `src/lib/contracts/actions.ts` (`ensureDefaultContractTemplate` calls `seed_starter_contract_template`)
- Test: `src/lib/contracts/starter-template.test.ts` (reads the migration SQL text)

- [ ] **Step 1: Failing test:** the starter seed SQL contains no occurrence of "Rønningen" or "Hameed" (case-insensitive). **Step 2:** Run → FAIL until the migration is clean; **Step 3:** switch the action. **Step 4:** Run → PASS. **Commit.**

---

## Step 2: Package variants (ship after Step 1 is live)

### Task 9: Package-to-template link and draft selection

**Files:**
- Create: `supabase/migrations/20261102170000_package_contract_template.sql` (adds `packages.contract_template_id uuid null` referencing `contract_templates (id)`; replaces `contract_create_draft` to prefer the booking's primary package template, falling back to `is_default`)
- Modify: package settings UI under `src/components/pricing/pricing-section.tsx` (select "Leieavtale": Standard or a template), `src/lib/contracts/templates.ts` (`listTemplates`, `createTemplateFromCopy`, `setDefaultTemplate`)
- Test: `src/lib/contracts/templates.test.ts` (extend)

**Interfaces:**
- Produces: `listTemplates(organizationId: string): Promise<ActionResult<{ templates: { id: string; name: string; isDefault: boolean; latestVersion: number }[] }>>`; `createTemplateFromCopy(input: { organizationId: string; sourceTemplateId: string; name: string }): Promise<ActionResult<{ templateId: string }>>`.

- [ ] **Step 1: Failing tests** for `createTemplateFromCopy` name validation (empty and > 80 chars rejected). **Step 2–4:** implement, run, verify in the browser pane that a package pointing at a copy produces a draft with the copy's text while other packages keep the standard. **Step 5: Commit.**

### Task 10: Release check

- [ ] Run `npx tsc --noEmit` and `npx vitest run src/lib/contracts` → clean (known unrelated failures: missing `@playwright/test`, `@testing-library/react`, admin tests).
- [ ] Ask the user to confirm, then push; confirm the Vercel production deploy is Ready (`vercel ls`).
