import { adminRoutes } from "@/config/admin-routes";
import {
  isBillingEnabled,
  isStripeConfigured,
  resolveStripePriceId,
} from "@/lib/billing/constants";
import { isEmailConfigured } from "@/lib/notifications/email-client";

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

export type EnvChecklistGroup =
  | "Kjerne"
  | "App"
  | "Fakturering"
  | "E-post"
  | "Cron";

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

export function buildStripeConfigStatus(): PlatformIntegrationComponent {
  const billingOn = isBillingEnabled();
  const stripeOn = isStripeConfigured();
  const webhookOn = isStripeWebhookConfigured();

  if (!billingOn) {
    return {
      id: "stripe",
      label: "Stripe",
      status: "info",
      detail: "Fakturering deaktivert i dette miljøet",
      runbook:
        "Aktiver NEXT_PUBLIC_BILLING_ENABLED og BILLING_ENABLED når du skal ta i bruk betaling.",
      envVars: ["NEXT_PUBLIC_BILLING_ENABLED", "BILLING_ENABLED"],
      href: adminRoutes.subscriptions,
    };
  }

  if (!stripeOn) {
    return {
      id: "stripe",
      label: "Stripe",
      status: "critical",
      detail: "Fakturering aktivert, men Stripe-nøkler mangler",
      runbook:
        "Sett STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY og STRIPE_PRICE_STANDARD (eller STRIPE_PRICE_ID). Kjør npm run stripe:setup for å opprette pris.",
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
      label: "Stripe",
      status: "warning",
      detail: "Stripe-nøkler er satt, men STRIPE_WEBHOOK_SECRET mangler",
      runbook:
        "Registrer webhook mot /api/webhooks/stripe og sett STRIPE_WEBHOOK_SECRET. Lokalt: stripe listen --forward-to localhost:3000/api/webhooks/stripe",
      envVars: ["STRIPE_WEBHOOK_SECRET"],
      href: adminRoutes.systemHealth,
    };
  }

  return {
    id: "stripe",
    label: "Stripe",
    status: "healthy",
    detail: "Betaling og webhooks er konfigurert",
    runbook: "Overvåk webhook-aktivitet under Systemhelse.",
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
): PlatformIntegrationComponent & { id: string } {
  const config = buildStripeConfigStatus();

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
    label: "Stripe webhooks",
    status:
      hoursSince == null
        ? "warning"
        : hoursSince > 48
          ? "warning"
          : "healthy",
    detail:
      hoursSince == null
        ? "Ingen webhooks mottatt ennå"
        : `Siste webhook for ${Math.round(hoursSince)} timer siden`,
    runbook:
      hoursSince == null || hoursSince > 48
        ? "Verifiser webhook-endepunkt og at Stripe sender hendelser til produksjon."
        : config.runbook,
    href: adminRoutes.settings,
  };
}

export function buildCronConfigStatus(): PlatformIntegrationComponent {
  const cronSecret = Boolean(process.env.CRON_SECRET?.trim());
  const billingOn = isBillingEnabled();

  if (!cronSecret) {
    return {
      id: "cron",
      label: "Bakgrunnsjobber",
      status: billingOn ? "critical" : "warning",
      detail: "CRON_SECRET er ikke satt",
      runbook:
        "Generer en hemmelighet og sett CRON_SECRET. Planlegg daglig kjøring av billing-enforcement via Vercel Cron eller ekstern scheduler.",
      envVars: ["CRON_SECRET"],
      href: adminRoutes.systemHealth,
    };
  }

  return {
    id: "cron",
    label: "Bakgrunnsjobber",
    status: "healthy",
    detail: "Cron-autentisering er konfigurert",
    runbook:
      "Bekreft at billing-enforcement kjører daglig. Se siste kjøringer under Systemhelse.",
    envVars: ["CRON_SECRET"],
    href: adminRoutes.systemHealth,
  };
}

export function buildCronHealthComponent(
  lastBillingRun: {
    status: string;
    finished_at: string | null;
  } | null,
): PlatformIntegrationComponent {
  const config = buildCronConfigStatus();

  if (config.status !== "healthy") {
    return config;
  }

  if (!lastBillingRun?.finished_at) {
    return {
      ...config,
      status: "warning",
      detail: "Venter på første kjøring av billing-enforcement",
      runbook:
        "Utløs cron manuelt eller vent på første planlagte kjøring. Sjekk platform_job_runs i Systemhelse.",
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
      ? "Siste billing-enforcement feilet"
      : stale
        ? `Siste kjøring for ${Math.round(hoursSince)} timer siden (for gammel)`
        : `Siste kjøring for ${Math.round(hoursSince)} timer siden (${lastBillingRun.status})`,
    runbook: failed
      ? "Undersøk feilloggen under Systemhelse og rett miljø/Stripe-problemer."
      : stale
        ? "Verifiser at cron-scheduler kjører og at CRON_SECRET matcher produksjon."
        : config.runbook,
    href: adminRoutes.systemHealth,
  };
}

export function buildEmailIntegrationStatus(): PlatformIntegrationComponent {
  const configured = isEmailConfigured();

  return {
    id: "email",
    label: "E-post (Resend)",
    status: configured ? "healthy" : "warning",
    detail: configured
      ? "Transaksjonell e-post er konfigurert"
      : "RESEND_API_KEY eller RESEND_FROM_EMAIL mangler",
    runbook: configured
      ? "E-post brukes til varsler og transaksjonelle meldinger."
      : "Opprett konto på Resend, verifiser domene, og sett RESEND_API_KEY og RESEND_FROM_EMAIL.",
    envVars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    href: adminRoutes.notifications,
  };
}

export function buildSupabaseAdminIntegrationStatus(): PlatformIntegrationComponent {
  const configured = isSupabaseAdminConfigured();

  return {
    id: "supabase-admin",
    label: "Supabase admin",
    status: configured ? "healthy" : "critical",
    detail: configured
      ? "Service role-nøkkel er satt"
      : "SUPABASE_SERVICE_ROLE_KEY mangler",
    runbook: configured
      ? "Bruk kun server-side. Roter nøkkel ved mistanke om lekkasje."
      : "Hent service role key fra Supabase Project Settings → API og sett SUPABASE_SERVICE_ROLE_KEY.",
    envVars: ["SUPABASE_SERVICE_ROLE_KEY"],
    href: adminRoutes.settings,
  };
}

export function buildAppUrlIntegrationStatus(): PlatformIntegrationComponent {
  const configured = isAppUrlConfigured();

  return {
    id: "app-url",
    label: "App-URL",
    status: configured ? "healthy" : "warning",
    detail: configured
      ? "NEXT_PUBLIC_APP_URL er satt"
      : "NEXT_PUBLIC_APP_URL mangler eller er ugyldig",
    runbook: configured
      ? "Brukes til Stripe redirect-URL-er og lenker i e-post."
      : "Sett NEXT_PUBLIC_APP_URL til produksjonsdomenet (f.eks. https://app.example.com).",
    envVars: ["NEXT_PUBLIC_APP_URL"],
    href: adminRoutes.settings,
  };
}

export function buildAllIntegrationStatuses(): PlatformIntegrationComponent[] {
  return [
    buildStripeConfigStatus(),
    buildCronConfigStatus(),
    buildEmailIntegrationStatus(),
    buildSupabaseAdminIntegrationStatus(),
    buildAppUrlIntegrationStatus(),
  ];
}

export function buildEnvChecklist(): EnvChecklistItem[] {
  const billingOn = isBillingEnabled();
  const anonOrPublishable =
    envIsSet("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    envIsSet("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const items: EnvChecklistItem[] = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      group: "Kjerne",
      isSet: envIsSet("NEXT_PUBLIC_SUPABASE_URL"),
      description: "Supabase-prosjekt URL",
      requiredFor: "Database og autentisering",
      required: true,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      group: "Kjerne",
      isSet: anonOrPublishable,
      description: "Anon/publishable nøkkel for klient",
      requiredFor: "Innlogging i appen",
      required: true,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      group: "Kjerne",
      isSet: envIsSet("SUPABASE_SERVICE_ROLE_KEY"),
      description: "Server-side admin-tilgang",
      requiredFor: "Admin og bakgrunnsjobber",
      required: true,
    },
    {
      name: "NEXT_PUBLIC_APP_URL",
      group: "App",
      isSet: isAppUrlConfigured(),
      description: "Offentlig app-adresse",
      requiredFor: "Stripe redirects og e-postlenker",
      required: true,
    },
    {
      name: "NEXT_PUBLIC_BILLING_ENABLED",
      group: "Fakturering",
      isSet: envIsSet("NEXT_PUBLIC_BILLING_ENABLED"),
      description: "Klient-side billing-flagg",
      requiredFor: "Abonnementsflyt",
      required: billingOn,
    },
    {
      name: "BILLING_ENABLED",
      group: "Fakturering",
      isSet: envIsSet("BILLING_ENABLED"),
      description: "Server-side billing-flagg",
      requiredFor: "Stripe og cron",
      required: billingOn,
    },
    {
      name: "STRIPE_SECRET_KEY",
      group: "Fakturering",
      isSet: envIsSet("STRIPE_SECRET_KEY"),
      description: "Stripe hemmelig nøkkel",
      requiredFor: "Betaling",
      required: billingOn,
    },
    {
      name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      group: "Fakturering",
      isSet: envIsSet("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
      description: "Stripe publishable key",
      requiredFor: "Checkout i nettleser",
      required: billingOn,
    },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      group: "Fakturering",
      isSet: envIsSet("STRIPE_WEBHOOK_SECRET"),
      description: "Webhook-signatur",
      requiredFor: "Abonnementssynk",
      required: billingOn,
    },
    {
      name: "BILLING_MODE",
      group: "Fakturering",
      isSet: envIsSet("BILLING_MODE"),
      description: "sandbox eller live",
      requiredFor: "Stripe test vs produksjon",
      required: billingOn,
    },
    {
      name: "STRIPE_PRICE_STANDARD",
      group: "Fakturering",
      isSet: Boolean(resolveStripePriceId()),
      description: "Stripe pris-ID (standard plan)",
      requiredFor: "Månedlig abonnement",
      required: billingOn,
    },
    {
      name: "STRIPE_PRODUCT_STANDARD",
      group: "Fakturering",
      isSet: envIsSet("STRIPE_PRODUCT_STANDARD"),
      description: "Stripe produkt-ID (valgfri)",
      requiredFor: "Admin-visning",
      required: false,
    },
    {
      name: "STRIPE_PRICE_ID",
      group: "Fakturering",
      isSet: envIsSet("STRIPE_PRICE_ID"),
      description: "Legacy pris-ID (alias)",
      requiredFor: "Månedlig abonnement",
      required: false,
    },
    {
      name: "RESEND_API_KEY",
      group: "E-post",
      isSet: envIsSet("RESEND_API_KEY"),
      description: "Resend API-nøkkel",
      requiredFor: "Varsler og e-post",
      required: false,
    },
    {
      name: "RESEND_FROM_EMAIL",
      group: "E-post",
      isSet: envIsSet("RESEND_FROM_EMAIL"),
      description: "Avsenderadresse",
      requiredFor: "Varsler og e-post",
      required: false,
    },
    {
      name: "CRON_SECRET",
      group: "Cron",
      isSet: envIsSet("CRON_SECRET"),
      description: "Autentisering for cron-endepunkter",
      requiredFor: "Billing-enforcement",
      required: billingOn,
    },
  ];

  return items;
}

export function countMissingRequiredEnv(items: EnvChecklistItem[]): number {
  return items.filter((item) => item.required && !item.isSet).length;
}
