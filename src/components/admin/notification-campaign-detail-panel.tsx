"use client";

import { useTranslation } from "@/i18n/client";
import { adminAuditHref } from "@/lib/admin/dashboard-links";
import { formatCampaignStatusLabel } from "@/lib/admin/notification-labels";
import type { AdminNotificationCampaign } from "@/lib/admin/queries/notifications";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";
import Link from "next/link";

type NotificationCampaignDetailPanelProps = {
  campaign: AdminNotificationCampaign;
};

export function NotificationCampaignDetailPanel({
  campaign,
}: NotificationCampaignDetailPanelProps) {
  const { t, locale } = useTranslation();
  return (
    <div className="space-y-3 p-1 app-text-secondary">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("adminLabels.fields.template")}
          </dt>
          <dd className="mt-1 font-mono text-app-sm text-foreground">
            {campaign.templateKey ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.status")}</dt>
          <dd className="mt-1 text-foreground">
            {formatCampaignStatusLabel(campaign.status, t)}
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("adminLabels.fields.created")}
          </dt>
          <dd className="mt-1 text-foreground">
            {format(new Date(campaign.createdAt), "d. MMM yyyy HH:mm", {
              locale: getDateFnsLocale(locale),
            })}
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("admin.notification_view_deliveries")}
          </dt>
          <dd className="mt-1 text-foreground">{campaign.deliveryCount}</dd>
        </div>
      </dl>

      <p>
        <Link
          href={adminAuditHref({
            category: "platform",
            q: campaign.id,
          })}
          className="font-semibold text-success hover:underline"
        >
          {t("admin.se_i_revisjonslogg")}
        </Link>
      </p>
    </div>
  );
}
