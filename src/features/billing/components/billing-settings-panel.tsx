"use client";

import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { BILLING_PLANS, getBillingPlan } from "@/config/billing-plans";
import { BillingNotice } from "@/features/billing/components/billing-notice";
import { PlanCard } from "@/features/billing/components/plan-card";
import { SubscriptionCard } from "@/features/billing/components/subscription-card";
import { deriveBillingView, resolveBillingNotice } from "@/features/billing/lib/billing-view";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useTranslation } from "@/i18n/client";
import { getDateFnsLocale } from "@/i18n/formatters";
import { createCheckoutSession } from "@/lib/billing/actions/create-checkout-session";
import { createPortalSession } from "@/lib/billing/actions/create-portal-session";
import { syncSubscriptionAfterCheckout } from "@/lib/billing/actions/sync-subscription-after-checkout";
import {
  clearBillingCheckoutParams,
  markBillingActivatedForDashboard,
  readBillingCheckoutParams,
} from "@/lib/billing/billing-checkout-return";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { format } from "date-fns";

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

function BillingSettingsSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation();
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
  const { t, locale } = useTranslation();
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
    return <BillingSettingsSkeleton label={checkoutSyncing ? t("billing.activating") : t("billing.loading")} />;
  }

  if (!currentOrganization) {
    return (
      <div className={cn(RN_CARD_SHELL, "px-6 py-8 text-center text-muted-foreground")}>
        <p className="font-medium text-foreground">{t("billing.noActiveOrg")}</p>
        <p className="mt-2 text-app-sm">{t("billing.createOrgFirst")}</p>
      </div>
    );
  }

  const status = subscription?.status ?? currentOrganization.subscriptionStatus;
  const plan = getBillingPlan(subscription?.plan ?? currentOrganization.subscriptionPlan) ?? BILLING_PLANS.standard;
  const billingOn = billingEnabled;
  const billingExempt = currentOrganization.billingExempt;
  const periodEndIso = subscription?.current_period_end ?? currentOrganization.periodEnd;
  const periodEnd = periodEndIso ? new Date(periodEndIso) : null;

  const view = deriveBillingView({
    billingOn,
    billingExempt,
    status,
    periodEndIso,
    providerSubscriptionId: subscription?.provider_subscription_id ?? null,
    providerCustomerId: subscription?.provider_customer_id ?? null,
  });

  const notice = billingExempt
    ? null
    : resolveBillingNotice({
        billingOn,
        status,
        trialExpired: view.trialExpired,
        offerCheckout: view.offerCheckout,
        hasStripeSubscription: view.hasStripeSubscription,
        isOwner,
        daysLeft: view.daysLeft,
      });

  const primaryCtaLabel =
    status === "incomplete" || view.trialExpired
      ? t("billing.completePayment")
      : view.offerCheckout
        ? t("billing.addPayment")
        : t("billing.startSubscription");

  const dayUnit = (days: number) => (days === 1 ? t("billing.attention.daySingular") : t("billing.attention.dayPlural"));
  const showDevIds = process.env.NODE_ENV === "development" && subscription?.provider_customer_id;

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title={t("billing.title")}
        description={t("billing.description", { name: currentOrganization.name })}
        actions={
          billingExempt || !billingOn ? null : (
            <StatusBadge tone={isSandbox ? "warning" : "neutral"} dot={false}>
              {isSandbox ? <FlaskConical className="size-3.5" aria-hidden /> : null}
              {billingModeLabel}
            </StatusBadge>
          )
        }
      />

      {billingExempt ? (
        <BillingNotice tone="success" title={t("billing.exemptTitle")}>
          <p>{t("billing.exemptBody")}</p>
        </BillingNotice>
      ) : null}

      {notice ? (
        <BillingNotice tone={notice.tone} title={t(notice.titleKey)}>
          <p>
            {t(notice.bodyKey, notice.days != null ? { days: `${notice.days} ${dayUnit(notice.days)}` } : undefined)}
          </p>
        </BillingNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start">
        <SubscriptionCard
          planName={plan.name}
          status={status}
          periodEndLabel={periodEnd ? format(periodEnd, "d. MMMM yyyy", { locale: dateLocale }) : null}
          daysLeft={view.daysLeft}
          billingOn={billingOn}
          billingExempt={billingExempt}
          isOwner={isOwner}
          hasStripeSubscription={view.hasStripeSubscription}
          showCheckout={view.showCheckout}
          showCheckoutCta={view.showCheckoutCta}
          showPortal={view.showPortal}
          noNotice={!notice}
          primaryCtaLabel={primaryCtaLabel}
          busy={actionLoading}
          syncing={checkoutSyncing}
          devIds={
            showDevIds && subscription
              ? { customer: subscription.provider_customer_id ?? "", subscription: subscription.provider_subscription_id }
              : null
          }
          onCheckout={() => void handleCheckout()}
          onRefresh={() => void handleRefreshStatus()}
          onPortal={() => void handlePortal()}
        />
        <PlanCard plan={plan} />
      </div>
    </div>
  );
}
