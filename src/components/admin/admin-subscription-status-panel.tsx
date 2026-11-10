"use client";

import { useTranslation } from "@/i18n/client";
import { AdminLinkButton } from "@/components/admin/admin-action-button";
import { AdminStatusBadge } from "@/components/admin/admin-badges";
import {
  adminSubscriptionsHref,
  subscriptionFilterForStatus,
} from "@/lib/admin/dashboard-links";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function AdminSubscriptionStatusPanel({
  statusCounts,
  className,
  embedded = false,
}: {
  statusCounts: Record<string, number>;
  className?: string;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const entries = Object.entries(statusCounts).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <section
      className={cn(
        embedded
          ? "min-w-0"
          : cn(
              RN_CARD_SHELL,
              "p-[length:var(--app-card-padding)] md:p-[length:calc(var(--app-card-padding)+0.25rem)]",
            ),
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="app-section-title">{t("adminLabels.sections.subscriptionStatus")}</h2>
        <AdminLinkButton href={adminSubscriptionsHref()}>
          {t("adminLabels.sections.allSubscriptions")}
        </AdminLinkButton>
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 app-text-muted">{t("adminLabels.empty.noOrgsRegistered")}</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {entries.map(([status, count]) => {
            const filter = subscriptionFilterForStatus(status);
            const content = (
              <>
                <AdminStatusBadge status={status} />
                <span className="font-heading text-app-md font-bold tabular-nums">
                  {count}
                </span>
              </>
            );

            if (!filter) {
              return (
                <li
                  key={status}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 app-text"
                >
                  {content}
                </li>
              );
            }

            return (
              <li key={status}>
                <Link
                  href={adminSubscriptionsHref(filter)}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
