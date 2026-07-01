import { adminRoutes } from "@/config/admin-routes";
import {
  isBillingEnabled,
  isStripeConfigured,
  resolveStripePriceId,
} from "@/lib/billing/constants";
import { isEmailConfigured } from "@/lib/notifications/email-client";
import type { Translator } from "@/i18n/types";

export type HealthStatus = "healthy" | "info" | "warning" | "critical";

export type PlatformIntegrationComponent = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  runbook: string;
  envVars: string[];
  href?: string;
};

export type EnvChecklistGroup = "core" | "app" | "billing" | "email" | "cron";

export type EnvChecklistItem = {
  name: string;
  group: EnvChecklistGroup;
  isSet: boolean;
  description: string;
  requiredFor: string;
  required: boolean;
};

const STATUS_RANK: Record<HealthStatus, number> = {
  healthy: 0,
  info: 0,
  warning: 1,
  critical: 2,
};

export function computeOverallStatus(
  components: { status: HealthStatus }[],
): HealthStatus {
  let worst: HealthStatus = "healthy";
  for (const component of components) {
    if (STATUS_RANK[component.status] > STATUS_RANK[worst]) {
      worst = component.status;
    }
  }
  return worst;
}

export function computeIntegrationSummary(
  components: PlatformIntegrationComponent[],
) {
  const configuredCount = components.filter(
    (c) => c.status === "healthy" || c.status === "info",
  ).length;

  return {
    overallStatus: computeOverallStatus(components),
    configuredCount,
    totalCount: components.length,
  };
}

function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

function isSupabaseAdminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function isAppUrlConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function envIsSet(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export function buildStripeConfigStatus(t: Translator): PlatformIntegrationComponent {
  const billingOn = isBillingEnabled();
  const stripeOn = isStripeConfigured();
  const webhookOn = isStripeWebhookConfigured();

  if (!billingOn) {
    return {
      id: "stripe",
      label: t("integrations.stripe.label"),
      status: "info",
      detail: t("integrations.stripe.billingDisabled"),
      runbook: t("integrations.stripe.billingDisabledRunbook"),
      envVars: ["NEXT_PUBLIC_BILLING_ENABLED", "BILLING_ENABLED"],
      href: adminRoutes.subscriptions,
    };
  }

  if (!stripeOn) {
    return {
      id: "stripe",
      label: t("integrations.stripe.label"),
      status: "critical",
      detail: t("integrations.stripe.keysMissing"),
      runbook: t("integrations.stripe.keysMissingRunbook"),
      envVars: [
        "STRIPE_SECRET_KEY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_PRICE_STANDARD",
      ],
      href: adminRoutes.subscriptions,
    };
  }

  if (!webhookOn) {
    return {
      id: "stripe",
      label: t("integrations.stripe.label"),
      status: "warning",
      detail: t("integrations.stripe.webhookMissing"),
      runbook: t("integrations.stripe.webhookMissingRunbook"),
      envVars: ["STRIPE_WEBHOOK_SECRET"],
      href: adminRoutes.systemHealth,
    };
  }

  return {
    id: "stripe",
    label: t("integrations.stripe.label"),
    status: "healthy",
    detail: t("integrations.stripe.configured"),
    runbook: t("integrations.stripe.monitorWebhooks"),
    envVars: [
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_PRICE_STANDARD",
      "STRIPE_WEBHOOK_SECRET",
    ],
    href: adminRoutes.systemHealth,
  };
}

export function buildStripeHealthComponent(
  lastWebhookAt: string | null,
  t: Translator,
): PlatformIntegrationComponent & { id: string } {
  const config = buildStripeConfigStatus(t);

  if (config.status === "info" || config.status === "critical") {
    return config;
  }

  if (config.status === "warning" && !isStripeWebhookConfigured()) {
    return config;
  }

  const hoursSince = lastWebhookAt
    ? (Date.now() - new Date(lastWebhookAt).getTime()) / (1000 * 60 * 60)
    : null;

  return {
    ...config,
    label: t("integrations.stripe.webhooksLabel"),
    status:
      hoursSince == null
        ? "warning"
        : hoursSince > 48
          ? "warning"
          : "healthy",
    detail:
      hoursSince == null
        ? t("integrations.stripe.noWebhooksYet")
        : t("integrations.stripe.lastWebhookHours", {
            hours: Math.round(hoursSince),
          }),
    runbook:
      hoursSince == null || hoursSince > 48
        ? t("integrations.stripe.verifyWebhook")
        : config.runbook,
    href: adminRoutes.settings,
  };
}

export function buildCronConfigStatus(t: Translator): PlatformIntegrationComponent {
  const cronSecret = Boolean(process.env.CRON_SECRET?.trim());
  const billingOn = isBillingEnabled();

  if (!cronSecret) {
    return {
      id: "cron",
      label: t("integrations.cron.label"),
      status: billingOn ? "critical" : "warning",
      detail: t("integrations.cron.secretMissing"),
      runbook: t("integrations.cron.secretMissingRunbook"),
      envVars: ["CRON_SECRET"],
      href: adminRoutes.systemHealth,
    };
  }

  return {
    id: "cron",
    label: t("integrations.cron.label"),
    status: "healthy",
    detail: t("integrations.cron.configured"),
    runbook: t("integrations.cron.confirmDaily"),
    envVars: ["CRON_SECRET"],
    href: adminRoutes.systemHealth,
  };
}

export function buildCronHealthComponent(
  lastBillingRun: {
    status: string;
    finished_at: string | null;
  } | null,
  t: Translator,
): PlatformIntegrationComponent {
  const config = buildCronConfigStatus(t);

  if (config.status !== "healthy") {
    return config;
  }

  if (!lastBillingRun?.finished_at) {
    return {
      ...config,
      status: "warning",
      detail: t("integrations.cron.awaitingFirstRun"),
      runbook: t("integrations.cron.awaitingFirstRunbook"),
      href: adminRoutes.systemHealth,
    };
  }

  const hoursSince =
    (Date.now() - new Date(lastBillingRun.finished_at).getTime()) /
    (1000 * 60 * 60);

  const stale = hoursSince > 26;
  const failed = lastBillingRun.status === "failed";

  return {
    ...config,
    status: failed ? "critical" : stale ? "warning" : "healthy",
    detail: failed
      ? t("integrations.cron.lastRunFailed")
      : stale
        ? t("integrations.cron.lastRunStale", { hours: Math.round(hoursSince) })
        : t("integrations.cron.lastRunOk", {
            hours: Math.round(hoursSince),
            status: lastBillingRun.status,
          }),
    runbook: failed
      ? t("integrations.cron.investigateFailed")
      : stale
        ? t("integrations.cron.verifyScheduler")
        : config.runbook,
    href: adminRoutes.systemHealth,
  };
}

export function buildEmailIntegrationStatus(t: Translator): PlatformIntegrationComponent {
  const configured = isEmailConfigured();

  return {
    id: "email",
    label: t("integrations.email.label"),
    status: configured ? "healthy" : "warning",
    detail: configured
      ? t("integrations.email.configured")
      : t("integrations.email.missing"),
    runbook: configured
      ? t("integrations.email.configuredRunbook")
      : t("integrations.email.missingRunbook"),
    envVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    href: adminRoutes.notifications,
  };
}

export function buildSupabaseAdminIntegrationStatus(t: Translator): PlatformIntegrationComponent {
  const configured = isSupabaseAdminConfigured();

  return {
    id: "supabase-admin",
    label: t("integrations.supabaseAdmin.label"),
    status: configured ? "healthy" : "critical",
    detail: configured
      ? t("integrations.supabaseAdmin.configured")
      : t("integrations.supabaseAdmin.missing"),
    runbook: configured
      ? t("integrations.supabaseAdmin.configuredRunbook")
      : t("integrations.supabaseAdmin.missingRunbook"),
    envVars: ["SUPABASE_SERVICE_ROLE_KEY"],
    href: adminRoutes.settings,
  };
}

export function buildAppUrlIntegrationStatus(t: Translator): PlatformIntegrationComponent {
  const configured = isAppUrlConfigured();

  return {
    id: "app-url",
    label: t("integrations.appUrl.label"),
    status: configured ? "healthy" : "warning",
    detail: configured
      ? t("integrations.appUrl.configured")
      : t("integrations.appUrl.missing"),
    runbook: configured
      ? t("integrations.appUrl.configuredRunbook")
      : t("integrations.appUrl.missingRunbook"),
    envVars: ["NEXT_PUBLIC_APP_URL"],
    href: adminRoutes.settings,
  };
}

export function buildAllIntegrationStatuses(t: Translator): PlatformIntegrationComponent[] {
  return [
    buildStripeConfigStatus(t),
    buildCronConfigStatus(t),
    buildEmailIntegrationStatus(t),
    buildSupabaseAdminIntegrationStatus(t),
    buildAppUrlIntegrationStatus(t),
  ];
}

export function buildEnvChecklist(t: Translator): EnvChecklistItem[] {
  const billingOn = isBillingEnabled();
  const anonOrPublishable =
    envIsSet("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    envIsSet("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const items: EnvChecklistItem[] = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      group: "core",
      isSet: envIsSet("NEXT_PUBLIC_SUPABASE_URL"),
      description: t("integrations.envChecklist.supabaseUrlDesc"),
      requiredFor: t("integrations.envChecklist.supabaseUrlRequiredFor"),
      required: true,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      group: "core",
      isSet: anonOrPublishable,
      description: t("integrations.envChecklist.supabaseAnonDesc"),
      requiredFor: t("integrations.envChecklist.supabaseAnonRequiredFor"),
      required: true,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      group: "core",
      isSet: envIsSet("SUPABASE_SERVICE_ROLE_KEY"),
      description: t("integrations.envChecklist.serviceRoleDesc"),
      requiredFor: t("integrations.envChecklist.serviceRoleRequiredFor"),
      required: true,
    },
    {
      name: "NEXT_PUBLIC_APP_URL",
      group: "app",
      isSet: isAppUrlConfigured(),
      description: t("integrations.envChecklist.appUrlDesc"),
      requiredFor: t("integrations.envChecklist.appUrlRequiredFor"),
      required: true,
    },
    {
      name: "NEXT_PUBLIC_BILLING_ENABLED",
      group: "billing",
      isSet: envIsSet("NEXT_PUBLIC_BILLING_ENABLED"),
      description: t("integrations.envChecklist.billingClientDesc"),
      requiredFor: t("integrations.envChecklist.billingClientRequiredFor"),
      required: billingOn,
    },
    {
      name: "BILLING_ENABLED",
      group: "billing",
      isSet: envIsSet("BILLING_ENABLED"),
      description: t("integrations.envChecklist.billingServerDesc"),
      requiredFor: t("integrations.envChecklist.billingServerRequiredFor"),
      required: billingOn,
    },
    {
      name: "STRIPE_SECRET_KEY",
      group: "billing",
      isSet: envIsSet("STRIPE_SECRET_KEY"),
      description: t("integrations.envChecklist.stripeSecretDesc"),
      requiredFor: t("integrations.envChecklist.paymentRequiredFor"),
      required: billingOn,
    },
    {
      name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      group: "billing",
      isSet: envIsSet("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      description: t("integrations.envChecklist.stripePublishableDesc"),
      requiredFor: t("integrations.envChecklist.stripePublishableRequiredFor"),
      required: billingOn,
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      group: "billing",
      isSet: envIsSet("STRIPE_WEBHOOK_SECRET"),
      description: t("integrations.envChecklist.webhookSecretDesc"),
      requiredFor: t("integrations.envChecklist.webhookSecretRequiredFor"),
      required: billingOn,
    },
    {
      name: "BILLING_MODE",
      group: "billing",
      isSet: envIsSet("BILLING_MODE"),
      description: t("integrations.envChecklist.billingModeDesc"),
      requiredFor: t("integrations.envChecklist.billingModeRequiredFor"),
      required: billingOn,
    },
    {
      name: "STRIPE_PRICE_STANDARD",
      group: "billing",
      isSet: Boolean(resolveStripePriceId()),
      description: t("integrations.envChecklist.stripePriceDesc"),
      requiredFor: t("integrations.envChecklist.monthlySubscription"),
      required: billingOn,
    },
    {
      name: "STRIPE_PRODUCT_STANDARD",
      group: "billing",
      isSet: envIsSet("STRIPE_PRODUCT_STANDARD"),
      description: t("integrations.envChecklist.stripeProductDesc"),
      requiredFor: t("integrations.envChecklist.stripeProductRequiredFor"),
      required: false,
    },
    {
      name: "STRIPE_PRICE_ID",
      group: "billing",
      isSet: envIsSet("STRIPE_PRICE_ID"),
      description: t("integrations.envChecklist.stripePriceLegacyDesc"),
      requiredFor: t("integrations.envChecklist.monthlySubscription"),
      required: false,
    },
    {
      name: "RESEND_API_KEY",
      group: "email",
      isSet: envIsSet("RESEND_API_KEY"),
      description: t("integrations.envChecklist.resendApiDesc"),
      requiredFor: t("integrations.envChecklist.notificationsAndEmail"),
      required: false,
    },
    {
      name: "RESEND_FROM_EMAIL",
      group: "email",
      isSet: envIsSet("RESEND_FROM_EMAIL"),
      description: t("integrations.envChecklist.senderAddress"),
      requiredFor: t("integrations.envChecklist.notificationsAndEmail"),
      required: false,
    },
    {
      name: "CRON_SECRET",
      group: "cron",
      isSet: envIsSet("CRON_SECRET"),
      description: t("integrations.envChecklist.cronSecretDesc"),
      requiredFor: t("integrations.envChecklist.cronSecretRequiredFor"),
      required: billingOn,
    },
  ];

  return items;
}

export function countMissingRequiredEnv(items: EnvChecklistItem[]): number {
  return items.filter((item) => item.required && !item.isSet).length;
}
