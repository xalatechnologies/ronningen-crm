"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { Button } from "@/components/ui/button";
import { BILLING_PLANS, getBillingPlan } from "@/config/billing-plans";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { createCheckoutSession } from "@/lib/billing/actions/create-checkout-session";
import { createPortalSession } from "@/lib/billing/actions/create-portal-session";
import { syncSubscriptionAfterCheckout } from "@/lib/billing/actions/sync-subscription-after-checkout";
import {
  canManageStripeSubscription,
  needsStripeCheckout,
} from "@/lib/billing/billing-ui-state";
import {
  SAAS_MONTHLY_PRICE_NOK,
  SAAS_TRIAL_DAYS,
} from "@/lib/billing/constants";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/admin/subscription-labels";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
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
  const label = SUBSCRIPTION_STATUS_LABELS[status] ?? status;
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

function BillingSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Laster fakturering">
      <div className={cn(RN_CARD_SHELL, "h-28 animate-pulse bg-muted/20")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className={cn(RN_CARD_SHELL, "h-64 animate-pulse bg-muted/20")} />
        <div className={cn(RN_CARD_SHELL, "h-64 animate-pulse bg-muted/20")} />
      </div>
    </div>
  );
}

function resolveAttentionMessage(input: {
  billingOn: boolean;
  status: string;
  trialExpired: boolean;
  showCheckout: boolean;
  hasStripeSubscription: boolean;
  isOwner: boolean;
}): AttentionMessage | null {
  if (!input.billingOn) {
    return {
      tone: "info",
      title: "Fakturering er ikke aktivert",
      body: "Kontakt support for å endre eller aktivere abonnement i dette miljøet.",
    };
  }

  if (input.trialExpired) {
    return {
      tone: "destructive",
      title: "Prøveperioden er over",
      body: input.isOwner
        ? "Fullfør betaling for å gjenopprette tilgang til appen."
        : "Organisasjonseieren må fullføre betaling for å gjenopprette tilgang.",
    };
  }

  if (input.status === "past_due") {
    return {
      tone: "destructive",
      title: "Betalingen mislyktes",
      body: input.isOwner
        ? "Oppdater betalingskortet i Stripe for å gjenopprette full tilgang."
        : "Organisasjonseieren må oppdatere betalingskortet.",
    };
  }

  if (input.status === "incomplete") {
    return {
      tone: "warning",
      title: "Abonnementet er ikke aktivert",
      body: input.isOwner
        ? "Fullfør betaling for å aktivere abonnementet og få tilgang til appen."
        : "Organisasjonseieren må fullføre betaling for å aktivere abonnementet.",
    };
  }

  if (
    input.showCheckout &&
    (input.status === "trialing" || input.status === "active") &&
    !input.hasStripeSubscription
  ) {
    return {
      tone: "warning",
      title: "Koble til Stripe",
      body: input.isOwner
        ? "Abonnementet må kobles til Stripe. Fullfør betaling for å starte 30 dagers prøveperiode."
        : "Organisasjonseieren må fullføre betaling for å koble abonnementet til Stripe.",
    };
  }

  if (input.status === "canceled") {
    return {
      tone: "info",
      title: "Abonnementet er avsluttet",
      body: input.isOwner
        ? "Start et nytt abonnement for å få tilgang igjen."
        : "Organisasjonseieren kan starte et nytt abonnement.",
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
  const router = useRouter();
  const supabase = useSupabase();
  const searchParams = useSearchParams();
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
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout === "canceled") {
      if (!checkoutHandledRef.current) {
        checkoutHandledRef.current = true;
        toast.message("Betaling avbrutt. Fullfør for å få tilgang til appen.");
      }
      router.replace("/app/settings/billing", { scroll: false });
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
        toast.success("Abonnement aktivert. Velkommen!");
        await refreshOrganizations();
        await reloadSubscription(currentOrganizationId);
        router.refresh();
        router.replace("/app/settings/billing", { scroll: false });
      } else {
        toast.error(
          "Betalingen er registrert, men vi kunne ikke oppdatere abonnementet ennå. Prøv «Oppdater status» eller vent et øyeblikk.",
        );
        checkoutHandledRef.current = false;
      }

      if (!cancelled) setCheckoutSyncing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    currentOrganizationId,
    refreshOrganizations,
    reloadSubscription,
    router,
  ]);

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
    const sessionId = searchParams.get("session_id");
    const result = await syncSubscriptionAfterCheckout(
      currentOrganizationId,
      sessionId,
    );
    setActionLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Abonnement oppdatert.");
    await refreshOrganizations();
    await reloadSubscription(currentOrganizationId);
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
    return <BillingSettingsSkeleton />;
  }

  if (!currentOrganization) {
    return (
      <div
        className={cn(
          RN_CARD_SHELL,
          "px-6 py-8 text-center text-muted-foreground",
        )}
      >
        <p className="font-medium text-foreground">Ingen aktiv organisasjon</p>
        <p className="mt-2 text-app-sm">
          Opprett en organisasjon før du kan administrere abonnement.
        </p>
      </div>
    );
  }

  const status =
    subscription?.status ?? currentOrganization.subscriptionStatus;
  const planId = subscription?.plan ?? currentOrganization.subscriptionPlan;
  const plan = getBillingPlan(planId) ?? BILLING_PLANS.standard;
  const billingOn = billingEnabled;
  const hasStripeSubscription = Boolean(subscription?.provider_subscription_id);
  const hasStripeCustomer = Boolean(subscription?.provider_customer_id);
  const showDevIds = process.env.NODE_ENV === "development";

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  const trialExpired =
    status === "trialing" &&
    periodEnd != null &&
    periodEnd.getTime() < Date.now();

  const showCheckout = needsStripeCheckout({
    billingEnabled: billingOn,
    hasStripeSubscription,
    status,
    trialExpired,
  });

  const showPortal = canManageStripeSubscription({
    billingEnabled: billingOn,
    hasStripeSubscription,
    hasStripeCustomer,
    status,
  });

  const attention = resolveAttentionMessage({
    billingOn,
    status,
    trialExpired,
    showCheckout,
    hasStripeSubscription,
    isOwner,
  });

  const primaryCtaLabel =
    status === "incomplete" || trialExpired
      ? "Fullfør betaling"
      : "Start abonnement";

  return (
    <div className="flex flex-col gap-6">
      <AppPageHeader
        surface="card"
        compact
        className="mb-0"
        title="Fakturering"
        description={
          <>
            Abonnement og betaling for{" "}
            <span className="font-medium text-foreground">
              {currentOrganization.name}
            </span>
            .
          </>
        }
        actions={
          billingOn && isSandbox ? (
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
                Abonnement
              </h2>
              <p className="mt-1 text-app-sm text-muted-foreground">
                Betaling og faktureringsperiode administreres via Stripe.
              </p>
            </div>
            {billingOn && hasStripeSubscription ? (
              <span className="text-app-xs font-medium text-muted-foreground">
                Stripe-koblet
              </span>
            ) : null}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nåværende status
              </dt>
              <dd className="mt-1.5">
                <SubscriptionStatusBadge status={status} />
              </dd>
            </div>
            <div>
              <dt className="text-app-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faktureringsperiode
              </dt>
              <dd className="mt-1.5 text-app-sm font-medium text-foreground">
                {periodEnd
                  ? format(periodEnd, "d. MMMM yyyy", { locale: nb })
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 border-t border-rn-border-strong/50 pt-5">
            {billingOn && showCheckout && isOwner ? (
              <Button
                type="button"
                size="cta"
                disabled={actionLoading || checkoutSyncing}
                onClick={() => void handleCheckout()}
              >
                {actionLoading ? "Åpner betaling…" : primaryCtaLabel}
              </Button>
            ) : null}

            {billingOn && isOwner && (showCheckout || !hasStripeSubscription) ? (
              <Button
                type="button"
                variant="outline"
                size="cta"
                className="w-full"
                disabled={actionLoading || checkoutSyncing}
                onClick={() => void handleRefreshStatus()}
              >
                {checkoutSyncing || actionLoading
                  ? "Oppdaterer status…"
                  : "Oppdater status"}
              </Button>
            ) : null}

            {billingOn && showPortal && isOwner ? (
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
                Administrer i Stripe
                <ExternalLink data-icon="inline-end" aria-hidden />
              </Button>
            ) : null}

            {billingOn && (showCheckout || showPortal) && !isOwner ? (
              <p className="rounded-md border border-rn-border-strong/60 bg-muted/25 px-4 py-3 text-app-sm text-muted-foreground">
                Kun organisasjonseieren kan starte, fullføre eller administrere
                abonnementet.
              </p>
            ) : null}

            {!billingOn ? (
              <p className="text-app-sm text-muted-foreground">
                <Link
                  href="/app/settings/support"
                  className="font-semibold text-success hover:underline"
                >
                  Kontakt support
                </Link>{" "}
                for å endre abonnement.
              </p>
            ) : null}

            {billingOn && !showCheckout && !showPortal && isOwner && !attention ? (
              <p className="text-app-sm text-muted-foreground">
                Abonnementet er aktivt. Bruk Stripe-portalen for å oppdatere
                betalingskort eller se fakturaer.
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
              Inkludert i planen
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
              {plan.name}
            </h2>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {SAAS_MONTHLY_PRICE_NOK.toLocaleString("nb-NO")}{" "}
              <span className="text-base font-medium text-muted-foreground">
                kr/mnd
              </span>
            </p>
            <p className="mt-2 text-app-sm leading-relaxed text-muted-foreground">
              {SAAS_TRIAL_DAYS} dagers gratis prøveperiode ved oppstart. Første
              trekk skjer når prøven er over.
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
                {feature}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
