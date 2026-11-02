# Standard rental-agreement template, owned by the organization

Status: draft for approval. Nothing is built yet.

## Intent and why

This is a multi-tenant SaaS. Each organization must own its standard rental agreement and
edit it in one place, instead of correcting every contract before it is sent. Today the text is
seeded from Rønningen's own agreement, parts of the layout are hardcoded (section headings,
signer name and signature image, closing line, package/add-on wording), and the only way to
change wording is to edit each draft contract.

Product owner's words: the agreement should be more standardized so you do not have to change
every contract sent to a customer; per-contract edits are fine for adding something; everything
in the standard agreement should be editable from where we have the overview of all packages.

Two bugs that exposed the gap (both already fixed in code, e6d50f0): withdrawing a contract did
not notify the customer, and edits made on a withdrawn version were lost on the next version.

## Goals

- One place per organization to edit the standard agreement: legal terms, payment terms,
  acceptance declaration, closing line, signer name and signature image, language.
- Every new contract and every unsent draft uses the organization's current standard.
- Per-contract editing stays, as the exception for adding something to one customer's contract.
- Optional variant per package (step 2): a package can point at its own template; packages
  without one use the standard.
- A new organization starts from a neutral starter template, not Rønningen's wording.

## Non-goals

- A block/clause builder or drag-and-drop layout editor.
- Uploading a customer's own PDF/Word agreement.
- Legal review of template text. The existing "approve legal terms" gate stays and is the
  organization's responsibility.
- Changing contracts that were already sent or signed.

## Anti-goals

- A template change must never alter a sent or signed contract (they are frozen documents).
- Editing the standard must not require touching individual contracts to take effect.
- No Rønningen-specific names, people or wording reachable by another organization.

## Constraints

- Existing tables are reused: `contract_templates` (several per org, one `is_default`),
  `contract_template_versions` (immutable, versioned, content-hashed),
  `rental_contract_versions.template_version_id`, per-version `document_overrides`.
- Frozen contracts and accepted contracts stay immutable.
- Norwegian is the primary UI language; template locale is stored per template.
- Production deploys from `feature/saas-multi-tenant`; migrations are applied by hand to the
  shared Supabase project.

## Approaches

- A. One standard per organization. Simplest; bryllup and julebord share terms.
- B. Standard plus optional per-package variant. Chosen. Reuses the multi-template schema.
- C. Clause/block library composed per template. Most flexible, largest, slowest.

Chosen: B, delivered in two steps. The product owner delegated the choice; this is the
assistant's call, with the reasoning above.

## Design

Step 1, standard template editor
- New settings page (extend `/app/settings/kontrakter`) with an editor for the default template:
  legal terms (multi-line text), payment terms, acceptance declaration, closing line, signer
  name, signature image upload, locale. Saving creates a new immutable template version
  (existing versioning/hash), it never edits an old one.
- Move the hardcoded layout values (`LESSOR_SIGNATURE_NAME`, signature image, closing line,
  section headings) into template fields with Norwegian defaults for new templates.
- Unsent drafts re-point to the latest template version when composed; sent/viewed/accepted
  versions keep the version they were frozen with.
- Starter template for new organizations: neutral generic wording, created when contracts are
  enabled. The Rønningen wording stays as Rønningen's own default template.
- The overview of all packages (pricing page, `/app/pricing`) gets a clear link/summary
  "Standard leieavtale" so the template is reachable from where packages are managed.
- Per-contract editing remains; changes there are labelled as exceptions for this customer.

Step 2, package variants
- `packages.contract_template_id` (nullable). Package settings get a "Leieavtale" select:
  Standard (default) or one of the organization's templates. Draft creation uses the booking's
  package template, falling back to the default.
- Template list screen: create from copy, rename, set default.

Customer notification and revision behavior already shipped (withdraw email, edits carried to
the next version) stay as they are.

## Left to the builder

- Exact editor layout and component choices, following existing settings pages.
- Signature image storage (existing contracts bucket vs. new), size/type limits.
- Migration details and backfill: existing templates map to the organization's default; existing
  hardcoded values become the Rønningen template's fields.
- Where exactly on the pricing page the template link/summary sits.

## Decisions to confirm (assistant's calls)

1. Template edits apply to new contracts and unsent drafts only.
2. New organizations get a neutral starter template, not Rønningen's.
3. Step 2 (package variants) ships after step 1.
