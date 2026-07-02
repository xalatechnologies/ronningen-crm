"use client";

import { useTranslation } from "@/i18n/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import { BILLING_PLANS, billingPlanFeatureLabel, getBillingPlan } from "@/config/billing-plans";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { createCheckoutSession } from "@/lib/billing/actions/create-checkout-session";
import { createPortalSession } from "@/lib/billing/actions/create-portal-session";
import { syncSubscriptionAfterCheckout } from "@/lib/billing/actions/sync-subscription-after-checkout";
import {
  clearBillingCheckoutParams,
  markBillingActivatedForDashboard,
  readBillingCheckoutParams,
} from "@/lib/billing/billing-checkout-return";
import {
  canManageStripeSubscription,
  canOfferStripeCheckout,
  needsStripeCheckout,
} from "@/lib/billing/billing-ui-state";
import {
  SAAS_MONTHLY_PRICE_NOK,
  SAAS_TRIAL_DAYS,
} from "@/lib/billing/constants";
import { statusLabel } from "@/lib/navigation/nav-labels";
import type { Translator } from "@/i18n/types";
import {
  isTrialPeriodExpired,
  trialDaysLeft,
} from "@/lib/subscriptions/subscription-utils";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { format } from "date-fns";
import { enGB } from "date-fns/locale/en-GB";
import { getDateFnsLocale } from "@/i18n/formatters";
import { Check, ExternalLink, FlaskConical } from "lucide-react";

type SubscriptionRow = {
  status: string;
  plan: string;
  current_period_start: string | null;
  current_period_end: string | null;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
};

type AttentionMessage = {
  tone: "destructive" | "warning" | "info";
  title: string;
  body: string;
};

function SubscriptionStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const label = statusLabel(status, t);
  const tone =
    status === "active"
      ? "border-success/40 bg-success/10 text-success"
      : status === "past_due"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : status === "trialing"
          ? "border-rn-accent-border/50 bg-rn-surface-gradient-from text-success dark:!text-white"
          : status === "incomplete"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            : "border-rn-border-strong bg-muted/30 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold md:text-app-sm",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

function BillingSettingsSkeleton({ label }: { label?: string }) {
  const { t, locale } = useTranslation();
  const resolved = label ?? t("organizations.loadingBilling");

  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={resolved}>
      <p className="text-app-sm font-medium text-muted-foreground">{resolved}…</p>
      <div className={cn(RN_CARD_SHELL, "h-28 animate-pulse bg-muted/20")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className={cn(RN_CARD_SHELL, "h-64 animate-pulse bg-muted/20")} />
        <div className={cn(RN_CARD_SHELL, "h-64 animate-pulse bg-muted/20")} />
      </div>
    </div>
  );
}

function resolveAttentionMessage(
  input: {
    billingOn: boolean;
    status: string;
    trialExpired: boolean;
    showCheckout: boolean;
    offerCheckout: boolean;
    hasStripeSubscription: boolean;
    isOwner: boolean;
    daysLeft: number | null;
  },
  t: Translator,
): AttentionMessage | null {
  if (!input.billingOn) {
    return {
      tone: "info",
      title: t("billing.attention.billingDisabledTitle"),
      body: t("billing.attention.billingDisabledBody"),
    };
  }

  if (input.trialExpired) {
    return {
      tone: "destructive",
      title: t("billing.attention.trialExpiredTitle"),
      body: input.isOwner
        ? t("billing.attention.trialExpiredOwner")
        : t("billing.attention.trialExpiredMember"),
    };
  }

  if (input.status === "past_due") {
    return {
      tone: "destructive",
      title: t("billing.attention.pastDueTitle"),
      body: input.isOwner
        ? t("billing.attention.pastDueOwner")
        : t("billing.attention.pastDueMember"),
    };
  }

  if (input.status === "incomplete") {
    return {
      tone: "warning",
      title: t("billing.attention.incompleteTitle"),
      body: input.isOwner
        ? t("billing.attention.incompleteOwner")
        : t("billing.attention.incompleteMember"),
    };
  }

  if (
    input.offerCheckout &&
    input.status === "trialing" &&
    !input.hasStripeSubscription
  ) {
    const daysLabel =
      input.daysLeft != null && input.daysLeft >= 0
        ? `${input.daysLeft} ${input.daysLeft === 1 ? t("billing.attention.daySingular") : t("billing.attention.dayPlural")}`
        : null;
    const endingSoon = input.daysLeft != null && input.daysLeft <= 7;

    return {
      tone: endingSoon ? "warning" : "info",
      title: endingSoon
        ? t("billing.attention.trialEndingTitle")
        : t("billing.attention.trialActiveTitle"),
      body: input.isOwner
        ? daysLabel
          ? t("billing.attention.trialOwnerWithDays", { days: daysLabel })
          : t("billing.attention.trialOwner")
        : daysLabel
          ? t("billing.attention.trialMemberWithDays", { days: daysLabel })
          : t("billing.attention.trialMember"),
    };
  }

  if (input.status === "canceled") {
    return {
      tone: "info",
      title: t("billing.attention.canceledTitle"),
      body: input.isOwner
        ? t("billing.attention.canceledOwner")
        : t("billing.attention.canceledMember"),
    };
  }

  return null;
}

const attentionToneClass: Record<AttentionMessage["tone"], string> = {
  destructive:
    "border-destructive/45 bg-destructive/8 text-destructive [&_strong]:text-destructive",
  warning:
    "border-amber-500/40 bg-amber-500/[0.06] text-foreground [&_strong]:text-foreground",
  info: "border-rn-border-strong/70 bg-muted/25 text-muted-foreground [&_strong]:text-foreground",
};

export function BillingSettingsPanel({
  billingEnabled,
  isSandbox,
  billingModeLabel,
  isOwner,
}: {
  billingEnabled: boolean;
  isSandbox: boolean;
  billingModeLabel: string;
  isOwner: boolean;
}) {
  const { t, formatCurrency, locale } = useTranslation();
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
  const supabase = useSupabase();
  const { currentOrganization, currentOrganizationId, loading, refreshOrganizations } =
    useCurrentOrganization();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
    null,
  );
  const [subLoading, setSubLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkoutSyncing, setCheckoutSyncing] = useState(false);
  const checkoutHandledRef = useRef(false);

  const reloadSubscription = useCallback(
    async (organizationId: string) => {
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "status, plan, current_period_start, current_period_end, provider, provider_customer_id, provider_subscription_id",
        )
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (data) setSubscription(data);
    },
    [supabase],
  );

  useEffect(() => {
    const { checkout, sessionId } = readBillingCheckoutParams();

    if (checkout === "canceled") {
      if (!checkoutHandledRef.current) {
        checkoutHandledRef.current = true;
        toast.message(t("billing.checkoutCanceled"));
      }
      clearBillingCheckoutParams();
      return;
    }

    if (checkout !== "success" || !currentOrganizationId) return;
    if (checkoutHandledRef.current) return;

    checkoutHandledRef.current = true;
    let cancelled = false;
    setCheckoutSyncing(true);

    void (async () => {
      const result = await syncSubscriptionAfterCheckout(
        currentOrganizationId,
        sessionId,
      );

      if (cancelled) return;

      if (result.ok) {
        markBillingActivatedForDashboard();
        window.location.assign("/app/dashboard");
        return;
      }

      toast.error(t("billing.syncFailed"));
      checkoutHandledRef.current = false;
      clearBillingCheckoutParams();

      if (!cancelled) setCheckoutSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentOrganizationId]);

  useEffect(() => {
    if (!supabase || !currentOrganizationId) {
      setSubscription(null);
      setSubLoading(false);
      return;
    }

    let cancelled = false;
    setSubLoading(true);

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select(
            "status, plan, current_period_start, current_period_end, provider, provider_customer_id, provider_subscription_id",
          )
          .eq("organization_id", currentOrganizationId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } catch {
        if (cancelled) return;
        setSubscription(null);
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, currentOrganizationId]);

  async function handleRefreshStatus() {
    if (!currentOrganizationId) return;
    setActionLoading(true);
    const { sessionId } = readBillingCheckoutParams();
    const result = await syncSubscriptionAfterCheckout(
      currentOrganizationId,
      sessionId,
    );
    setActionLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(t("billing.subscriptionUpdated"));
    await refreshOrganizations();
    await reloadSubscription(currentOrganizationId);
    clearBillingCheckoutParams();
    router.refresh();
  }

  async function handleCheckout() {
    if (!currentOrganizationId) return;
    setActionLoading(true);
    const result = await createCheckoutSession(currentOrganizationId);
    setActionLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    window.location.href = result.url;
  }

  async function handlePortal() {
    if (!currentOrganizationId) return;
    setActionLoading(true);
    const result = await createPortalSession(currentOrganizationId);
    setActionLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    window.location.href = result.url;
  }

  if (subLoading || checkoutSyncing || (loading && !currentOrganization)) {
    return (
      <BillingSettingsSkeleton
        label={
          checkoutSyncing ? t("billing.activating") : t("billing.loading")
        }
      />
    );
  }

  if (!currentOrganization) {
    return (
      <div
        className={cn(
          RN_CARD_SHELL,
          "px-6 py-8 text-center text-muted-foreground",
        )}
      >
        <p className="font-medium text-foreground">{t("billing.noActiveOrg")}</p>
        <p className="mt-2 text-app-sm">{t("billing.createOrgFirst")}</p>
      </div>
    );
  }

  const status =
    subscription?.status ?? currentOrganization.subscriptionStatus;
  const planId = subscription?.plan ?? currentOrganization.subscriptionPlan;
  const plan = getBillingPlan(planId) ?? BILLING_PLANS.standard;
  const billingOn = billingEnabled;
  const billingExempt = currentOrganization.billingExempt;
  const hasStripeSubscription = Boolean(subscription?.provider_subscription_id);
  const hasStripeCustomer = Boolean(subscription?.provider_customer_id);
  const showDevIds = process.env.NODE_ENV === "development";

  const periodEndIso =
    subscription?.current_period_end ?? currentOrganization.periodEnd;
  const periodEnd = periodEndIso ? new Date(periodEndIso) : null;

  const trialAccessInput = {
    is_suspended: false,
    subscription_status: status,
    current_period_end: periodEndIso,
    provider_subscription_id: subscription?.provider_subscription_id ?? null,
  };

  const trialExpired =
    status === "trialing" && isTrialPeriodExpired(trialAccessInput);

  const showCheckout = needsStripeCheckout({
    billingEnabled: billingOn,
    billingExempt,
    hasStripeSubscription,
    status,
    trialExpired,
  });

  const offerCheckout = canOfferStripeCheckout({
    billingEnabled: billingOn,
    billingExempt,
    hasStripeSubscription,
    status,
    trialExpired,
  });

  const daysLeft =
    status === "trialing" ? trialDaysLeft(trialAccessInput) : null;

  const showPortal = canManageStripeSubscription({
    billingEnabled: billingOn,
    hasStripeSubscription,
    hasStripeCustomer,
    status,
  });

  const attention = billingExempt
    ? null
    : resolveAttentionMessage(
        {
          billingOn,
          status,
          trialExpired,
          showCheckout,
          offerCheckout,
          hasStripeSubscription,
          isOwner,
          daysLeft,
        },
        t,
      );

  const showCheckoutCta = showCheckout || offerCheckout;

  const primaryCtaLabel =
    status === "incomplete" || trialExpired
      ? t("billing.completePayment")
      : offerCheckout
        ? t("billing.addPayment")
        : t("billing.startSubscription");

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("billing.title")}
        description={
          <>
            {t("billing.description", { name: currentOrganization.name })}
          </>
        }
        actions={
          billingExempt ? (
            <span className="rounded-md border border-success/40 bg-success/10 px-2.5 py-1 text-app-xs font-semibold text-success">
              {t("billing.exemptBadge")}
            </span>
          ) : billingOn && isSandbox ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/35 bg-amber-500/[0.08] px-2.5 py-1 text-app-xs font-semibold text-amber-900 dark:text-amber-100">
              <FlaskConical className="size-3.5" aria-hidden />
              {billingModeLabel}
            </span>
          ) : billingOn ? (
            <span className="rounded-md border border-rn-border-strong/60 bg-muted/30 px-2.5 py-1 text-app-xs font-semibold text-muted-foreground">
              {billingModeLabel}
            </span>
          ) : null
        }
      />

      {billingExempt ? (
        <div
          role="status"
          className="rounded-[length:var(--app-radius)] border-2 border-success/35 bg-success/10 px-4 py-3.5 md:px-5 md:py-4"
        >
          <p className="text-app-sm font-semibold text-success">
            {t("billing.exemptTitle")}
          </p>
          <p className="mt-1 text-app-sm leading-relaxed text-muted-foreground">
            {t("billing.exemptBody")}
          </p>
        </div>
      ) : null}

      {attention ? (
        <div
          role="alert"
          className={cn(
            "rounded-[length:var(--app-radius)] border-2 px-4 py-3.5 md:px-5 md:py-4",
            attentionToneClass[attention.tone],
          )}
        >
          <p className="text-app-sm font-semibold">{attention.title}</p>
          <p className="mt-1 text-app-sm leading-relaxed">{attention.body}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
        <section className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rn-border-strong/50 pb-5">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">
                {t("billing.subscription")}
              </h2>
              <p className="mt-1 text-app-sm text-muted-foreground">
                {t("billing.subscriptionDescription")}
              </p>
            </div>
            {billingOn && hasStripeSubscription && !billingExempt ? (
              <span className="text-app-xs font-medium text-muted-foreground">
                {t("billing.stripeLinked")}
              </span>
            ) : null}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("billing.currentStatus")}
              </dt>
              <dd className="mt-1.5">
                <SubscriptionStatusBadge status={status} />
              </dd>
            </div>
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("billing.billingPeriod")}
              </dt>
              <dd className="mt-1.5 text-app-sm font-medium text-foreground">
                {periodEnd
                  ? format(periodEnd, "d. MMMM yyyy", { locale: dateLocale })
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 border-t border-rn-border-strong/50 pt-5">
            {!billingExempt && billingOn && showCheckoutCta && isOwner ? (
              <Button
                type="button"
                size="cta"
                disabled={actionLoading || checkoutSyncing}
                onClick={() => void handleCheckout()}
              >
                {actionLoading ? t("billing.openingPayment") : primaryCtaLabel}
              </Button>
            ) : null}

            {!billingExempt && billingOn && isOwner && (showCheckoutCta || !hasStripeSubscription) ? (
              <Button
                type="button"
                variant="outline"
                size="cta"
                className="w-full"
                disabled={actionLoading || checkoutSyncing}
                onClick={() => void handleRefreshStatus()}
              >
                {checkoutSyncing || actionLoading
                  ? t("billing.refreshingStatus")
                  : t("billing.refreshStatus")}
              </Button>
            ) : null}

            {!billingExempt && billingOn && showPortal && isOwner ? (
              <Button
                type="button"
                variant={showCheckout ? "outline" : "success"}
                size="cta"
                className={cn(
                  "w-full",
                  showCheckout &&
                    "border-2 border-success/55 bg-success/10 font-semibold text-success shadow-sm hover:bg-success/20 dark:!text-white [&_svg]:text-success dark:[&_svg]:!text-white",
                )}
                disabled={actionLoading}
                onClick={() => void handlePortal()}
              >
                {t("billing.manageInStripe")}
                <ExternalLink data-icon="inline-end" aria-hidden />
              </Button>
            ) : null}

            {!billingExempt && billingOn && (showCheckout || showPortal) && !isOwner ? (
              <p className="rounded-md border border-rn-border-strong/60 bg-muted/25 px-4 py-3 text-app-sm text-muted-foreground">
                {t("billing.ownerOnly")}
              </p>
            ) : null}

            {!billingOn ? (
              <p className="text-app-sm text-muted-foreground">
                <Link
                  href="/app/settings/support"
                  className="font-semibold text-success hover:underline"
                >
                  {t("billing.contactSupportChange")}
                </Link>{" "}
                {t("billing.contactSupportSuffix")}
              </p>
            ) : null}

            {!billingExempt && billingOn && !showCheckout && !showPortal && isOwner && !attention ? (
              <p className="text-app-sm text-muted-foreground">
                {t("billing.activeHint")}
              </p>
            ) : null}
          </div>

          {showDevIds && subscription?.provider_customer_id ? (
            <div className="rounded-md border border-dashed border-rn-border-strong/60 bg-muted/15 px-3 py-2 font-mono text-app-xs text-muted-foreground">
              <p>kunde: {subscription.provider_customer_id}</p>
              {subscription.provider_subscription_id ? (
                <p>abonnement: {subscription.provider_subscription_id}</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className={cn(RN_CARD_SHELL, "flex flex-col gap-5 p-5 md:p-6")}>
          <div>
            <p className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("billing.includedInPlan")}
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
              {plan.name}
            </h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(SAAS_MONTHLY_PRICE_NOK)}{" "}
              <span className="text-base font-medium text-muted-foreground">
                {t("billing.perMonth")}
              </span>
            </p>
            <p className="mt-2 text-app-sm leading-relaxed text-muted-foreground">
              {t("billing.trialNote", { days: SAAS_TRIAL_DAYS })}
            </p>
          </div>

          <ul className="flex flex-col gap-2 border-t border-rn-border-strong/50 pt-5">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-app-sm text-foreground"
              >
                <Check
                  className="mt-0.5 size-4 shrink-0 text-success"
                  aria-hidden
                />
                {billingPlanFeatureLabel(feature, t)}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
