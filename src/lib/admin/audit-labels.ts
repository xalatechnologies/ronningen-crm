const ADMIN_AUDIT_ACTION_LABELS: Record<string, string> = {
  "organization.subscription_updated": "Abonnement oppdatert",
  "organization.subscription_period_updated": "Periode oppdatert",
  "organization.subscription_synced": "Stripe-synkronisering",
  "organization.suspended": "Organisasjon suspendert",
  "organization.unsuspended": "Suspensjon opphevet",
  "organization.notes_updated": "Admin-notater oppdatert",
  "organization.deleted": "Organisasjon slettet",
  "organization.member_removed": "Medlem fjernet",
  "organization.member_role_updated": "Medlemsrolle endret",
  "organization.ownership_transferred": "Eierskap overført",
  "organization.bulk_suspended": "Masse-suspensjon",
  "organization.bulk_unsuspended": "Masse oppheving av suspensjon",
  "organization.bulk_trial_extended": "Masse utvidet prøve",
  "user.platform_admin_granted": "Plattformadmin tildelt",
  "user.platform_admin_revoked": "Plattformadmin fjernet",
  "user.disabled": "Bruker deaktivert",
  "user.deleted_after_org_delete": "Bruker slettet etter org-sletting",
  "user.enabled": "Bruker aktivert",
  "user.password_reset_initiated": "Passordtilbakestilling startet",
  "subscription.payment_retried": "Betaling forsøkt på nytt",
  "subscription.canceled": "Abonnement avsluttet",
  "impersonation.started": "Visning som organisasjon startet",
  "impersonation.ended": "Visning som organisasjon avsluttet",
  "feature_flag.updated": "Funksjonsflagg oppdatert",
  "export.organizations_csv": "Organisasjoner eksportert (CSV)",
  "export.audit_csv": "Revisjonslogg eksportert (CSV)",
  "support.ticket_created": "Support-sak opprettet",
  "support.ticket_status_updated": "Support-status oppdatert",
  "notification.template_upserted": "E-postmal oppdatert",
  "notification.campaign_created": "Varslingskampanje opprettet",
  "notification.campaign_status_updated": "Kampanjestatus oppdatert",
  "notification.campaign_sent": "Kampanje sendt",
};

export function formatAuditActionLabel(action: string): string {
  return ADMIN_AUDIT_ACTION_LABELS[action] ?? action;
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  organization: "Organisasjon",
  user: "Bruker",
  platform: "Plattform",
};

export function formatAuditTargetLabel(targetType: string): string {
  return TARGET_TYPE_LABELS[targetType] ?? targetType;
}
