#!/usr/bin/env node
/**
 * Batch-convert hardcoded Norwegian UI strings to t() calls (admin-labels, common, etc.).
 */
import { readFileSync, writeFileSync } from "node:fs";

const GLOBAL = [
  ['>Ingen treff for «{results.query}».<', '>{t("adminLabels.empty.noSearchResults", { query: results.query })}<'],
  ['>Ingen treff for «{query}».<', '>{t("adminLabels.empty.noSearchResults", { query })}<'],
  ['>Ingen treff for «{results.query}».<', '>{t("adminLabels.empty.noSearchResults", { query: results.query })}<'],
  ['<p className="app-text-muted">Ingen treff for «{results.query}».</p>', '<p className="app-text-muted">{t("adminLabels.empty.noSearchResults", { query: results.query })}</p>'],
  ['<span className="sr-only">Gå til {label}</span>', '<span className="sr-only">{t("admin.overview_go_to", { label })}</span>'],
  ['>Ingen webhooks registrert.<', '>{t("adminLabels.empty.noWebhooks")}<'],
  ['>Ingen jobbkjøringer registrert ennå.<', '>{t("adminLabels.empty.noJobRuns")}<'],
  ['>Ingen organisasjonsunntak.<', '>{t("adminLabels.empty.noOrgExceptions")}<'],
  ['>Organisasjons-ID<', '>{t("adminLabels.fields.organizationId")}<'],
  ['<Label htmlFor="support-org">Organisasjon</Label>', '<Label htmlFor="support-org">{t("adminLabels.fields.organization")}</Label>'],
  ['<Label htmlFor="support-subject">Emne</Label>', '<Label htmlFor="support-subject">{t("adminLabels.fields.subject")}</Label>'],
  ['<Label htmlFor="new-template-subject">Emne</Label>', '<Label htmlFor="new-template-subject">{t("adminLabels.fields.subject")}</Label>'],
  ['<Label htmlFor={`subject-${template.key}`}>Emne</Label>', '<Label htmlFor={`subject-${template.key}`}>{t("adminLabels.fields.subject")}</Label>'],
  ['>Avbryt<', '>{t("common.actions.cancel")}<'],
  ['<th className={tableHeadClass}>Organisasjon</th>', '<th className={tableHeadClass}>{t("adminLabels.fields.organization")}</th>'],
  ['<th className={tableHeadClass}>Emne</th>', '<th className={tableHeadClass}>{t("adminLabels.fields.subject")}</th>'],
  ['<TableHead>Emne</TableHead>', '<TableHead>{t("adminLabels.fields.subject")}</TableHead>'],
  ['<TableHead>Organisasjon</TableHead>', '<TableHead>{t("adminLabels.fields.organization")}</TableHead>'],
  ['<p className="text-app-sm font-medium text-success">Lagret.</p>', '<p className="text-app-sm font-medium text-success">{t("adminLabels.saved")}</p>'],
  ['>Ingen meldinger ennå.<', '>{t("adminLabels.empty.noMessages")}<'],
  ['>Ingen support-saker for denne organisasjonen.<', '>{t("adminLabels.empty.noSupportTickets")}<'],
  ['>Ingen flagg i dette filteret<', '>{t("adminLabels.empty.noFlagsInFilter")}<'],
  ['"Bekreft endring av funksjonsflagg."', 't("admin.bekreft_endring_av_funksjonsflagg")'],
  ['>Ingen Stripe-kobling<', '>{t("adminLabels.connection.noStripeLink")}<'],
  ['>Ingen organisasjoner i dette filteret.<', '>{t("adminLabels.empty.noOrgsInFilter")}<'],
  ['<TableHead>Organisasjon</TableHead>', '<TableHead>{t("adminLabels.fields.organization")}</TableHead>'],
  ['<dt className="app-text-muted">Registrert</dt>', '<dt className="app-text-muted">{t("adminLabels.fields.registered")}</dt>'],
  ['<th className={tableHeadClass}>Registrert</th>', '<th className={tableHeadClass}>{t("adminLabels.fields.registered")}</th>'],
  ['>Ingen plattformadministratorer funnet.<', '>{t("adminLabels.empty.noPlatformAdmins")}<'],
  ['>Ingen organisasjoner registrert.<', '>{t("adminLabels.empty.noOrgsRegistered")}<'],
  ['>Ingen variabler matcher filteret.<', '>{t("adminLabels.empty.noVariablesMatch")}<'],
  ['>Ingen organisasjonstilknytning.<', '>{t("adminLabels.empty.noOrgMembership")}<'],
  ['>Ingen registrerte handlinger for denne brukeren.<', '>{t("adminLabels.empty.noUserAudit")}<'],
  ['confirmLabel = "Bekreft"', 'confirmLabel = t("common.actions.confirm")'],
  ['>Ingen medlemmer registrert.<', '>{t("adminLabels.empty.noMembers")}<'],
  ['<span className="text-app-xs text-muted-foreground">Valgfri</span>', '<span className="text-app-xs text-muted-foreground">{t("common.actions.optional")}</span>'],
  ['>Ingen maler i dette filteret.<', '>{t("adminLabels.empty.noTemplatesInFilter")}<'],
  ['>Ingen kampanjer i dette filteret.<', '>{t("adminLabels.empty.noCampaignsInFilter")}<'],
  ['>Ingen leveringer i dette filteret.<', '>{t("adminLabels.empty.noDeliveriesInFilter")}<'],
  ['>Lukk<', '>{t("common.actions.close")}<'],
  ['>Ingen aktive abonnement med MRR akkurat nå<', '>{t("adminLabels.empty.noActiveMrr")}<'],
  ['>Ingen varsler ennå.<', '>{t("adminLabels.empty.noNotifications")}<'],
  ['>Ingen treff<', '>{t("common.empty.noResults")}<'],
  ['<span className="sr-only">Lukk</span>', '<span className="sr-only">{t("common.actions.close")}</span>'],
  ['confirmLabel = "Bekreft",', 'confirmLabel = t("common.actions.confirm"),'],
  ['cancelLabel = "Avbryt",', 'cancelLabel = t("common.actions.cancel"),'],
  ['busyLabel ?? "Lagrer…"', 'busyLabel ?? t("common.saving")'],
  ['{busy ? "Sletter…" : confirmLabel}', '{busy ? t("common.deleting") : confirmLabel}'],
  ['confirmLabel = "Ja, slett"', 'confirmLabel = t("common.confirm.deleteConfirm")'],
  ['placeholder="Valgfritt"', 'placeholder={t("common.actions.optional")}'],
  ['placeholder="Velg organisasjon"', 'placeholder={t("admin.velg_organisasjon")}'],
  ['label = "Laster …"', 'label = t("common.actions.loading")'],
  ['label = "Laster fakturering"', 'label = t("organizations.loadingBilling")'],
  ['aria-label="Laster side"', 'aria-label={t("common.loadingPage")}'],
  ['aria-label="Velg visningstetthet"', 'aria-label={t("settings.appearance.densityAria")}'],
  ['>{t("invoices.printToolbar.saveAsPdf")}<', '>{t("invoices.printToolbar.saveAsPdf")}<'],
  ['>Skriv ut<', '>{t("common.actions.print")}<'],
  ['>Varsler<', '>{t("notifications.inbox.title")}<'],
  ['>Ingen organisasjon<', '>{t("admin.ingen_organisasjon")}<'],
  ['>Farlig sone<', '>{t("adminLabels.sections.dangerousZone")}<'],
  ['>Slett organisasjon<', '>{t("adminLabels.deleteOrganization")}<'],
  ['>Ja<', '>{t("adminLabels.fields.yes")}<'],
  ['>Nei<', '>{t("adminLabels.fields.no")}<'],
  ['import { nb } from "date-fns/locale/nb";', 'import { getDateFnsLocale } from "@/i18n/formatters";'],
  ['{ locale: nb }', '{ locale: dateFnsLocale }'],
  ['createdLabel ? `Registrert ${createdLabel}` : null', 'createdLabel ? t("adminLabels.fields.registeredAt", { date: createdLabel }) : null'],
];

const FILE_SPECIFIC = {
  "src/components/admin/organization-delete-panel.tsx": [
    ['Sletter {organizationName} permanent, inkludert medlemmer, data og\n          abonnement.', '{t("adminLabels.deleteOrgDescription", { name: organizationName })}'],
    ['title={`Slett ${organizationName}?`}', 'title={t("adminLabels.deleteOrgTitle", { name: organizationName })}'],
    ['<p>Dette kan ikke angres. Skriv inn slug for å bekrefte:</p>', '<p>{t("adminLabels.deleteOrgConfirmHint")}</p>'],
    ['<Label htmlFor="confirm-slug">Slug</Label>', '<Label htmlFor="confirm-slug">{t("adminLabels.fields.slug")}</Label>'],
  ],
  "src/components/admin/admin-organizations-workspace.tsx": [
    ['Organisasjonene mister tilgang til appen inntil suspensjonen\n              oppheves. Begrunnelse logges i revisjonsloggen.', '{t("adminLabels.suspendDialogHint")}'],
  ],
  "src/components/invoices/print-toolbar.tsx": [
    ['I utskriftsvinduet: velg <span className="font-semibold text-foreground">Lagre som PDF</span>{" "}', '{t("invoices.printToolbar.dialogHintPrefix")} <span className="font-semibold text-foreground">{t("invoices.printToolbar.saveAsPdf")}</span>{" "}'],
    ['(Chrome/Edge) eller <span className="font-semibold text-foreground">PDF</span> (Safari).', '{t("invoices.printToolbar.dialogHintSafari")} <span className="font-semibold text-foreground">PDF</span> {t("invoices.printToolbar.dialogHintPdf")}'],
  ],
  "src/components/notifications/notification-bell.tsx": [
    ['? `Varsler, ${unreadCount} uleste`\n            : "Varsler"', '? t("notifications.bell.unreadAria", { count: unreadCount })\n            : t("notifications.inbox.title")'],
    ['function formatWhen(iso: string): string {\n  return format(new Date(iso), "d. MMM HH:mm", { locale: nb });\n}', 'function formatWhen(iso: string, dateFnsLocale: ReturnType<typeof getDateFnsLocale>): string {\n  return format(new Date(iso), "d. MMM HH:mm", { locale: dateFnsLocale });\n}'],
    ['formatWhen(notification.created_at)', 'formatWhen(notification.created_at, dateFnsLocale)'],
  ],
  "src/components/settings/appearance-settings-card.tsx": [
    ['const densityLabels: Record<DisplayDensity, string> = {\n  compact: "Kompakt",\n  comfortable: "Normal",\n  spacious: "Romslig",\n};', ''],
    ['{densityLabels[key]}', '{t(`settings.appearance.density.${key}`)}'],
    ['>Utseende<', '>{t("settings.appearance.title")}<'],
    ['Tilpass fargetema og visningstetthet i appen.', '{t("settings.appearance.description")}'],
    ['>Fargetema<', '>{t("common.theme.label")}<'],
    ['>Visningstetthet<', '>{t("settings.appearance.densityLabel")}<'],
  ],
  "src/components/admin/user-detail/tabs.ts": [
    [`export const USER_DETAIL_TABS = [
  { id: "account", label: "Konto" },
  { id: "organizations", label: "Organisasjoner" },
  { id: "audit", label: "Revisjon" },
] as const;

export type UserDetailTabId = (typeof USER_DETAIL_TABS)[number]["id"];

const TAB_IDS = new Set<string>(USER_DETAIL_TABS.map((tab) => tab.id));`, `import type { Translator } from "@/i18n/types";

export const USER_DETAIL_TAB_IDS = ["account", "organizations", "audit"] as const;

export type UserDetailTabId = (typeof USER_DETAIL_TAB_IDS)[number];

const TAB_IDS = new Set<string>(USER_DETAIL_TAB_IDS);

export function getUserDetailTabs(t: Translator) {
  return [
    { id: "account" as const, label: t("adminLabels.fields.account") },
    { id: "organizations" as const, label: t("adminLabels.fields.organizations") },
    { id: "audit" as const, label: t("adminLabels.fields.audit") },
  ];
}`],
  ],
  "src/components/admin/organization-detail/tabs.ts": [
    [`export const ORGANIZATION_DETAIL_TABS = [
  { id: "profile", label: "Profil" },
  { id: "subscription", label: "Abonnement" },
  { id: "members", label: "Medlemmer" },
  { id: "usage", label: "Bruk" },
  { id: "billing", label: "Fakturering" },
  { id: "support", label: "Support" },
] as const;

export type OrganizationDetailTabId =
  (typeof ORGANIZATION_DETAIL_TABS)[number]["id"];

const TAB_IDS = new Set<string>(
  ORGANIZATION_DETAIL_TABS.map((tab) => tab.id),
);`, `import type { Translator } from "@/i18n/types";

export const ORGANIZATION_DETAIL_TAB_IDS = [
  "profile",
  "subscription",
  "members",
  "usage",
  "billing",
  "support",
] as const;

export type OrganizationDetailTabId =
  (typeof ORGANIZATION_DETAIL_TAB_IDS)[number];

const TAB_IDS = new Set<string>(ORGANIZATION_DETAIL_TAB_IDS);

export function getOrganizationDetailTabs(t: Translator) {
  return [
    { id: "profile" as const, label: t("adminLabels.fields.profile") },
    { id: "subscription" as const, label: t("adminLabels.fields.subscription") },
    { id: "members" as const, label: t("adminLabels.fields.members") },
    { id: "usage" as const, label: t("adminLabels.fields.usage") },
    { id: "billing" as const, label: t("adminLabels.fields.billing") },
    { id: "support" as const, label: t("adminLabels.fields.support") },
  ];
}`],
  ],
  "src/components/admin/user-detail/user-detail-header.tsx": [
    ['USER_DETAIL_TABS,', 'getUserDetailTabs(t),'],
    ['import {\n  USER_DETAIL_TABS,', 'import {\n  getUserDetailTabs,'],
  ],
  "src/components/admin/organization-detail/organization-detail-tab-bar.tsx": [
    ['ORGANIZATION_DETAIL_TABS,', 'getOrganizationDetailTabs,'],
    ['{ORGANIZATION_DETAIL_TABS.map((tab) => {', '{getOrganizationDetailTabs(t).map((tab) => {'],
  ],
};

const USE_TRANSLATION_IMPORT = 'import { useTranslation } from "@/i18n/client";';

function ensureUseTranslation(content, filePath) {
  if (content.includes("useTranslation")) return content;
  if (!content.includes('t("') && !content.includes("t('")) return content;
  if (content.includes('"use client"') || content.includes("'use client'")) {
    const clientMatch = content.match(/^["']use client["'];?\n/m);
    if (clientMatch) {
      const insertAt = clientMatch.index + clientMatch[0].length;
      return content.slice(0, insertAt) + "\n" + USE_TRANSLATION_IMPORT + content.slice(insertAt);
    }
  }
  return USE_TRANSLATION_IMPORT + "\n" + content;
}

function ensureHook(content) {
  if (!content.includes('t("') && !content.includes("t('")) return content;
  if (content.match(/const\s+\{\s*t[^}]*\}\s*=\s*useTranslation\(\)/)) return content;

  // Try to add hook after first function component opening
  const patterns = [
    /export function \w+[^{]+\{\n/,
    /function \w+[^{]+\{\n/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const insertAt = match.index + match[0].length;
      let hook = "  const { t } = useTranslation();\n";
      if (content.includes("dateFnsLocale") || content.includes("getDateFnsLocale")) {
        hook = "  const { t, locale } = useTranslation();\n  const dateFnsLocale = getDateFnsLocale(locale);\n";
      }
      return content.slice(0, insertAt) + hook + content.slice(insertAt);
    }
  }
  return content;
}

function applyReplacements(content, replacements) {
  let out = content;
  for (const [from, to] of replacements) {
    if (out.includes(from)) {
      out = out.replaceAll(from, to);
    }
  }
  return out;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/i18n-admin-labels-convert.mjs <files...>");
  process.exit(1);
}

let changed = 0;
for (const file of files) {
  let content = readFileSync(file, "utf8");
  const original = content;
  content = applyReplacements(content, GLOBAL);
  if (FILE_SPECIFIC[file]) {
    content = applyReplacements(content, FILE_SPECIFIC[file]);
  }
  content = ensureUseTranslation(content, file);
  content = ensureHook(content);
  if (content !== original) {
    writeFileSync(file, content);
    changed++;
    console.log("updated:", file);
  }
}
console.log(`Done. ${changed} files updated.`);
