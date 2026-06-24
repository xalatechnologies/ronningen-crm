"use client";

import { adminAuditHref } from "@/lib/admin/dashboard-links";
import { formatCampaignStatusLabel } from "@/lib/admin/notification-labels";
import type { AdminNotificationCampaign } from "@/lib/admin/queries/notifications";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import Link from "next/link";

type NotificationCampaignDetailPanelProps = {
  campaign: AdminNotificationCampaign;
};

export function NotificationCampaignDetailPanel({
  campaign,
}: NotificationCampaignDetailPanelProps) {
  return (
    <div className="space-y-3 p-1 app-text-secondary">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mal
          </dt>
          <dd className="mt-1 font-mono text-app-sm text-foreground">
            {campaign.templateKey ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </dt>
          <dd className="mt-1 text-foreground">
            {formatCampaignStatusLabel(campaign.status)}
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Opprettet
          </dt>
          <dd className="mt-1 text-foreground">
            {format(new Date(campaign.createdAt), "d. MMM yyyy HH:mm", {
              locale: nb,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Leveringer
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
          Se i revisjonslogg
        </Link>
      </p>
    </div>
  );
}
