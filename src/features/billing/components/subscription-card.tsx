"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SubscriptionStatusBadge } from "@/features/billing/components/subscription-status-badge";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  planName: string;
  status: string;
  /** Formatted end of the current period, or null when unknown. */
  periodEndLabel: string | null;
  daysLeft: number | null;
  billingOn: boolean;
  billingExempt: boolean;
  isOwner: boolean;
  hasStripeSubscription: boolean;
  showCheckout: boolean;
  showCheckoutCta: boolean;
  showPortal: boolean;
  /** True when no notice is shown, so a short "all good" hint fits. */
  noNotice: boolean;
  primaryCtaLabel: string;
  busy: boolean;
  syncing: boolean;
  devIds: { customer: string; subscription: string | null } | null;
  onCheckout: () => void;
  onRefresh: () => void;
  onPortal: () => void;
};

export function SubscriptionCard(props: Props) {
  const { t } = useTranslation();
  const { billingOn, billingExempt, isOwner, busy, syncing, status } = props;
  const actionsAllowed = billingOn && !billingExempt;
  const dayUnit = props.daysLeft === 1 ? t("billing.attention.daySingular") : t("billing.attention.dayPlural");
  const showDaysLeft = status === "trialing" && props.daysLeft != null && props.daysLeft >= 0;

  return (
    <section className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground/10 pb-5">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground md:text-xl">{t("billing.subscription")}</h2>
          <p className="mt-1 text-app-sm text-muted-foreground">{t("billing.subscriptionDescription")}</p>
        </div>
        {actionsAllowed && props.hasStripeSubscription ? (
          <span className="text-app-xs font-medium text-muted-foreground">{t("billing.stripeLinked")}</span>
        ) : null}
      </div>

      <dl className="grid gap-5 sm:grid-cols-3">
        <div>
          <dt className="text-app-xs font-semibold text-muted-foreground">{t("billing.planLabel")}</dt>
          <dd className="mt-1.5 text-app-sm font-medium text-foreground">{props.planName}</dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold text-muted-foreground">{t("billing.currentStatus")}</dt>
          <dd className="mt-1.5">
            <SubscriptionStatusBadge status={status} />
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold text-muted-foreground">
            {status === "trialing" ? t("billing.periodTrialEnds") : t("billing.periodEnds")}
          </dt>
          <dd className="mt-1.5 text-app-sm font-medium text-foreground">
            {props.periodEndLabel ?? "—"}
            {showDaysLeft ? (
              <span className="block text-app-xs font-normal text-muted-foreground">
                {t("billing.daysLeft", { days: `${props.daysLeft} ${dayUnit}` })}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 border-t border-foreground/10 pt-5">
        {actionsAllowed && props.showCheckoutCta && isOwner ? (
          <Button type="button" size="cta" disabled={busy || syncing} onClick={props.onCheckout}>
            {busy ? t("billing.openingPayment") : props.primaryCtaLabel}
          </Button>
        ) : null}

        {actionsAllowed && props.showPortal && isOwner ? (
          <Button
            type="button"
            variant={props.showCheckout ? "outline" : "success"}
            size="cta"
            className="w-full"
            disabled={busy}
            onClick={props.onPortal}
          >
            {t("billing.manageInStripe")}
            <ExternalLink data-icon="inline-end" aria-hidden />
          </Button>
        ) : null}

        {actionsAllowed && isOwner && (props.showCheckoutCta || !props.hasStripeSubscription) ? (
          <Button type="button" variant="ghost" size="sm" className="w-fit" disabled={busy || syncing} onClick={props.onRefresh}>
            {syncing || busy ? t("billing.refreshingStatus") : t("billing.refreshStatus")}
          </Button>
        ) : null}

        {actionsAllowed && (props.showCheckout || props.showPortal) && !isOwner ? (
          <p className="rounded-xl bg-muted/50 px-4 py-3 text-app-sm text-muted-foreground ring-1 ring-foreground/10">
            {t("billing.ownerOnly")}
          </p>
        ) : null}

        {!billingOn ? (
          <p className="text-app-sm text-muted-foreground">
            <Link href="/app/settings/support" className="font-semibold text-success hover:underline">
              {t("billing.contactSupportChange")}
            </Link>{" "}
            {t("billing.contactSupportSuffix")}
          </p>
        ) : null}

        {actionsAllowed && !props.showCheckout && !props.showPortal && isOwner && props.noNotice ? (
          <p className="text-app-sm text-muted-foreground">{t("billing.activeHint")}</p>
        ) : null}
      </div>

      {props.devIds ? (
        <div className="rounded-xl border border-dashed border-foreground/25 bg-muted/15 px-3 py-2 font-mono text-app-xs text-muted-foreground">
          <p>kunde: {props.devIds.customer}</p>
          {props.devIds.subscription ? <p>abonnement: {props.devIds.subscription}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
