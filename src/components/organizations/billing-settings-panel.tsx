"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { differenceInCalendarDays, format } from "date-fns";
import { nb } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  past_due: "Forfalt",
  canceled: "Avsluttet",
  incomplete: "Ufullstendig",
};

type SubscriptionRow = {
  status: string;
  plan: string;
  current_period_start: string | null;
  current_period_end: string | null;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
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
  const checkoutHandledRef = useRef(false);

  useEffect(() => {
    const checkout = searchParams.get("checkout");

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
    router.replace("/app/settings/billing", { scroll: false });

    let cancelled = false;

    void (async () => {
      const result = await syncSubscriptionAfterCheckout(currentOrganizationId);
      if (cancelled) return;

      if (result.ok) {
        toast.success("Abonnement aktivert. Velkommen!");
        await refreshOrganizations();
        const { data } = await supabase
          .from("subscriptions")
          .select(
            "status, plan, current_period_start, current_period_end, provider, provider_customer_id, provider_subscription_id",
          )
          .eq("organization_id", currentOrganizationId)
          .maybeSingle();
        if (data) setSubscription(data);
      } else {
        toast.success(
          "Betaling mottatt. Abonnementet oppdateres om et øyeblikk.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, currentOrganizationId, supabase, refreshOrganizations, router]);

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

  if (subLoading || (loading && !currentOrganization)) {
    return <p className="text-muted-foreground">Laster abonnement…</p>;
  }

  if (!currentOrganization) {
    return (
      <p className="text-muted-foreground">
        Ingen aktiv organisasjon. Opprett en organisasjon først.
      </p>
    );
  }

  const status =
    subscription?.status ?? currentOrganization.subscriptionStatus;
  const plan = subscription?.plan ?? currentOrganization.subscriptionPlan;
  const statusLabel = STATUS_LABELS[status] ?? status;
  const billingOn = billingEnabled;
  const hasStripeSubscription = Boolean(subscription?.provider_subscription_id);
  const hasStripeCustomer = Boolean(subscription?.provider_customer_id);
  const showDevIds = process.env.NODE_ENV === "development";

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const daysLeft =
    periodEnd && status === "trialing"
      ? differenceInCalendarDays(periodEnd, new Date())
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

  return (
    <div className="flex flex-col gap-6">
      {billingOn && isSandbox ? (
        <p className="rounded-md border border-amber-500/35 bg-amber-500/[0.06] px-4 py-3 text-app-sm text-foreground">
          <span className="font-semibold">Testmiljø</span> — Stripe sandbox er
          aktiv. Ingen ekte betalinger blir belastet.
        </p>
      ) : null}

      <Card
        className={cn(
          RN_CARD_SHELL,
          status === "past_due" && "border-destructive/50 bg-destructive/5",
        )}
      >
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-heading text-xl">Abonnement</CardTitle>
            {billingOn ? (
              <span className="rounded-md border border-rn-border-strong/60 bg-muted/40 px-2 py-0.5 text-app-xs font-semibold text-muted-foreground">
                {billingModeLabel}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-app-base">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-app-sm text-muted-foreground">Organisasjon</p>
              <p className="font-medium">{currentOrganization.name}</p>
            </div>
            <div>
              <p className="text-app-sm text-muted-foreground">Plan</p>
              <p className="font-medium">Standard</p>
            </div>
            <div>
              <p className="text-app-sm text-muted-foreground">Status</p>
              <p className="font-medium">{statusLabel}</p>
            </div>
          </div>

          <div className="rounded-md border border-rn-border-strong/60 bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {SAAS_MONTHLY_PRICE_NOK} kr/mnd
            </p>
            <p className="mt-1 text-muted-foreground">
              {SAAS_TRIAL_DAYS} dagers gratis prøveperiode ved oppstart. Første
              trekk skjer når prøven er over.
            </p>
          </div>

          {periodEnd ? (
            <p className="text-sm text-muted-foreground">
              {status === "trialing"
                ? "Prøveperiode til"
                : "Neste faktureringsperiode til"}
              :{" "}
              <span className="font-medium text-foreground">
                {format(periodEnd, "d. MMMM yyyy", { locale: nb })}
              </span>
              {daysLeft != null && daysLeft >= 0 && status === "trialing" ? (
                <> ({daysLeft} {daysLeft === 1 ? "dag" : "dager"} igjen)</>
              ) : null}
            </p>
          ) : null}

          {trialExpired ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Prøveperioden er over. Fullfør betaling for å få tilgang igjen.
            </p>
          ) : null}

          {status === "past_due" ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Betalingen mislyktes. Oppdater betalingskortet for å gjenopprette
              full tilgang.
            </p>
          ) : null}

          {status === "incomplete" ? (
            <p className="rounded-md border border-rn-border-strong/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Fullfør betaling for å aktivere abonnementet og få tilgang til
              appen.
            </p>
          ) : null}

          {showCheckout &&
          (status === "trialing" || status === "active") &&
          !hasStripeSubscription ? (
            <p className="rounded-md border border-amber-500/35 bg-amber-500/[0.06] px-4 py-3 text-sm text-foreground">
              Abonnementet må kobles til Stripe for å fortsette.{" "}
              {isOwner
                ? "Fullfør betaling for å aktivere 30 dagers prøveperiode."
                : "Organisasjonseieren må fullføre betaling."}
            </p>
          ) : null}

          {status === "canceled" ? (
            <p className="rounded-md border border-rn-border-strong/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Abonnementet er avsluttet. Start et nytt abonnement for å få
              tilgang igjen.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {billingOn && showCheckout && isOwner ? (
              <Button
                type="button"
                size="cta"
                disabled={actionLoading}
                onClick={() => void handleCheckout()}
              >
                {actionLoading
                  ? "Åpner betaling…"
                  : status === "incomplete" || trialExpired
                    ? "Fullfør betaling"
                    : "Start abonnement"}
              </Button>
            ) : null}

            {billingOn && showCheckout && !isOwner ? (
              <p className="rounded-md border border-rn-border-strong/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Kun organisasjonseieren kan starte eller fullføre betaling. Be
                eieren om å logge inn og fullføre abonnementet her.
              </p>
            ) : null}

            {billingOn && showPortal && isOwner ? (
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading}
                onClick={() => void handlePortal()}
              >
                Administrer abonnement
              </Button>
            ) : null}

            {billingOn && showPortal && !isOwner ? (
              <p className="text-app-sm text-muted-foreground">
                Kun organisasjonseieren kan administrere abonnementet i Stripe.
              </p>
            ) : null}
          </div>

          {showDevIds && subscription?.provider_customer_id ? (
            <div className="rounded-md border border-dashed border-rn-border-strong/60 bg-muted/20 px-3 py-2 font-mono text-app-xs text-muted-foreground">
              <p>kunde: {subscription.provider_customer_id}</p>
              {subscription.provider_subscription_id ? (
                <p>abonnement: {subscription.provider_subscription_id}</p>
              ) : null}
            </div>
          ) : null}

          {!billingOn ? (
            <p className="text-app-sm text-muted-foreground">
              Fakturering er deaktivert i dette miljøet.{" "}
              <Link
                href="/app/settings/support"
                className="font-semibold text-success hover:underline"
              >
                Kontakt support
              </Link>{" "}
              for å endre abonnement.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
