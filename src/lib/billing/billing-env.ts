import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

export type BillingMode = "sandbox" | "live";

export type BillingConfig = {
  enabled: boolean;
  mode: BillingMode;
  priceId: string | null;
  productId: string | null;
  publishableKey: string | null;
  appUrl: string;
  webhookSecret: string | null;
  secretKey: string | null;
};

function envFlag(name: string): boolean {
  return process.env[name]?.trim() === "true";
}

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function isBillingEnabled(): boolean {
  return (
    envFlag("NEXT_PUBLIC_BILLING_ENABLED") || envFlag("BILLING_ENABLED")
  );
}

export function getBillingMode(): BillingMode {
  const mode = envValue("BILLING_MODE")?.toLowerCase();
  return mode === "live" ? "live" : "sandbox";
}

export function isSandboxBilling(): boolean {
  return getBillingMode() !== "live";
}

export function getStripeModeLabel(locale: Locale = "nb"): string {
  const t = createTranslator(getDictionary(locale));
  return isSandboxBilling()
    ? t("serverErrors.billing.testEnv")
    : t("serverErrors.billing.production");
}

export function resolveStripePriceId(): string | null {
  return envValue("STRIPE_PRICE_STANDARD") ?? envValue("STRIPE_PRICE_ID");
}

export function resolveStripeProductId(): string | null {
  return envValue("STRIPE_PRODUCT_STANDARD");
}

export function getAppOrigin(): string {
  const configured = envValue("NEXT_PUBLIC_APP_URL")?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function isValidAppUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateStripeKeyModes(
  config: BillingConfig,
  locale: Locale = "nb",
): BillingConfigError | null {
  const t = createTranslator(getDictionary(locale));
  const secretKey = config.secretKey;
  const publishableKey = config.publishableKey;

  if (!secretKey || !publishableKey) {
    return null;
  }

  const secretIsTest = secretKey.startsWith("sk_test_");
  const secretIsLive = secretKey.startsWith("sk_live_");
  const publishableIsTest = publishableKey.startsWith("pk_test_");
  const publishableIsLive = publishableKey.startsWith("pk_live_");

  if (config.mode === "sandbox") {
    if (!secretIsTest) {
      return {
        ok: false,
        error: t("serverErrors.billing.sandboxRequiresTestKey"),
      };
    }
    if (!publishableIsTest) {
      return {
        ok: false,
        error: t("serverErrors.billing.sandboxPublishableKey"),
      };
    }
    return null;
  }

  if (!secretIsLive) {
    return {
      ok: false,
      error: t("serverErrors.billing.liveRequiresLiveKey"),
    };
  }
  if (!publishableIsLive) {
    return {
      ok: false,
      error: t("serverErrors.billing.livePublishableKey"),
    };
  }

  return null;
}

export function isStripeLivemodeExpected(): boolean {
  return getBillingMode() === "live";
}

export function getBillingConfig(): BillingConfig {
  return {
    enabled: isBillingEnabled(),
    mode: getBillingMode(),
    priceId: resolveStripePriceId(),
    productId: resolveStripeProductId(),
    publishableKey: envValue("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    appUrl: getAppOrigin(),
    webhookSecret: envValue("STRIPE_WEBHOOK_SECRET"),
    secretKey: envValue("STRIPE_SECRET_KEY"),
  };
}

export function isStripeConfigured(): boolean {
  if (!isBillingEnabled()) {
    return Boolean(
      envValue("STRIPE_SECRET_KEY") &&
        resolveStripePriceId() &&
        envValue("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    );
  }

  const config = getBillingConfig();
  return Boolean(
    config.secretKey &&
      config.priceId &&
      config.publishableKey &&
      config.webhookSecret &&
      isValidAppUrl(config.appUrl),
  );
}

export type BillingConfigError = {
  ok: false;
  error: string;
};

export type BillingConfigOk = {
  ok: true;
  config: BillingConfig;
};

export function assertBillingConfigured():
  | BillingConfigOk
  | BillingConfigError {
  if (!isBillingEnabled()) {
    return { ok: false, error: "Fakturering er ikke aktivert." };
  }

  const config = getBillingConfig();

  if (!config.secretKey) {
    return { ok: false, error: "STRIPE_SECRET_KEY mangler." };
  }

  if (!config.priceId) {
    return {
      ok: false,
      error: "STRIPE_PRICE_STANDARD eller STRIPE_PRICE_ID mangler.",
    };
  }

  if (!config.publishableKey) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY mangler.",
    };
  }

  if (!config.webhookSecret) {
    return { ok: false, error: "STRIPE_WEBHOOK_SECRET mangler." };
  }

  if (!isValidAppUrl(config.appUrl)) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_APP_URL mangler eller er ugyldig.",
    };
  }

  const keyModeError = validateStripeKeyModes(config);
  if (keyModeError) {
    return keyModeError;
  }

  return { ok: true, config };
}
