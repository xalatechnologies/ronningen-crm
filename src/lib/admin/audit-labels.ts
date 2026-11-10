import type { TranslationKey, Translator } from "@/i18n/types";

const ADMIN_AUDIT_ACTION_KEYS: Record<string, TranslationKey> = {
  "organization.subscription_updated": "audit.actions.organizationSubscriptionUpdated",
  "organization.subscription_period_updated": "audit.actions.organizationSubscriptionPeriodUpdated",
  "organization.subscription_synced": "audit.actions.organizationSubscriptionSynced",
  "organization.suspended": "audit.actions.organizationSuspended",
  "organization.unsuspended": "audit.actions.organizationUnsuspended",
  "organization.notes_updated": "audit.actions.organizationNotesUpdated",
  "organization.deleted": "audit.actions.organizationDeleted",
  "organization.member_removed": "audit.actions.organizationMemberRemoved",
  "organization.member_role_updated": "audit.actions.organizationMemberRoleUpdated",
  "organization.ownership_transferred": "audit.actions.organizationOwnershipTransferred",
  "organization.bulk_suspended": "audit.actions.organizationBulkSuspended",
  "organization.bulk_unsuspended": "audit.actions.organizationBulkUnsuspended",
  "organization.bulk_trial_extended": "audit.actions.organizationBulkTrialExtended",
  "user.platform_admin_granted": "audit.actions.userPlatformAdminGranted",
  "user.platform_admin_revoked": "audit.actions.userPlatformAdminRevoked",
  "user.disabled": "audit.actions.userDisabled",
  "user.deleted_after_org_delete": "audit.actions.userDeletedAfterOrgDelete",
  "user.enabled": "audit.actions.userEnabled",
  "user.password_reset_initiated": "audit.actions.userPasswordResetInitiated",
  "subscription.payment_retried": "audit.actions.subscriptionPaymentRetried",
  "subscription.canceled": "audit.actions.subscriptionCanceled",
  "impersonation.started": "audit.actions.impersonationStarted",
  "impersonation.ended": "audit.actions.impersonationEnded",
  "feature_flag.updated": "audit.actions.featureFlagUpdated",
  "export.organizations_csv": "audit.actions.exportOrganizationsCsv",
  "export.audit_csv": "audit.actions.exportAuditCsv",
  "support.ticket_created": "audit.actions.supportTicketCreated",
  "support.ticket_status_updated": "audit.actions.supportTicketStatusUpdated",
  "notification.template_upserted": "audit.actions.notificationTemplateUpserted",
  "notification.campaign_created": "audit.actions.notificationCampaignCreated",
  "notification.campaign_status_updated": "audit.actions.notificationCampaignStatusUpdated",
  "notification.campaign_sent": "audit.actions.notificationCampaignSent",
};

export function formatAuditActionLabel(action: string, t: Translator): string {
  const key = ADMIN_AUDIT_ACTION_KEYS[action];
  return key ? t(key) : action;
}

const TARGET_TYPE_KEYS: Record<string, TranslationKey> = {
  organization: "audit.targets.organization",
  user: "audit.targets.user",
  platform: "audit.targets.platform",
};

export function formatAuditTargetLabel(targetType: string, t: Translator): string {
  const key = TARGET_TYPE_KEYS[targetType];
  return key ? t(key) : targetType;
}
