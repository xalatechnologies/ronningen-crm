"use client";

import { useTranslation } from "@/i18n/client";
import { AdminDataPanel } from "@/components/admin/admin-data-panel";
import { OrganizationDeletePanel } from "@/components/admin/organization-delete-panel";
import type { AdminOrganizationDetail } from "@/lib/admin/queries/organizations";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n/formatters";

import type { Locale } from "@/i18n/config";

function formatDateTime(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  return format(new Date(iso), "d. MMM yyyy HH:mm", { locale: getDateFnsLocale(locale) });
}

export function OrganizationProfileTab({ org }: { org: AdminOrganizationDetail }) {
  const { t, locale } = useTranslation();
  const notFilled = (
    <span className="font-normal text-muted-foreground">
      {t("adminLabels.fields.notFilledIn")}
    </span>
  );
  return (
    <div className="flex flex-col gap-6">
      <AdminDataPanel title={t("admin.profil")}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.owner")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.owner
                ? [org.owner.fullName, org.owner.email].filter(Boolean).join(" · ") || notFilled
                : notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.tagline")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.tagline ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.phone")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.contactPhone ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.address")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.addressLines.length > 0 ? org.addressLines.join(", ") : notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.bankAccount")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.bankAccount ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.legalName")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.legalName ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.orgNumber")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.orgNumber ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.contactEmail")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.contactEmail ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.billingEmail")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {org.billingEmail ?? notFilled}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.created")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {formatDateTime(org.createdAt, locale)}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.lastUpdated")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {formatDateTime(org.updatedAt, locale)}
            </dd>
          </div>
          <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
            <dt className="app-text-muted">{t("adminLabels.fields.lastActivity")}</dt>
            <dd className="mt-1 font-heading text-app-md font-semibold">
              {formatDateTime(org.lastActivityAt, locale)}
            </dd>
          </div>
          {org.isSuspended ? (
            <>
              <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
                <dt className="app-text-muted">{t("admin.suspendert")}</dt>
                <dd className="mt-1 font-heading text-app-md font-semibold">
                  {formatDateTime(org.suspendedAt, locale)}
                </dd>
              </div>
              <div className="sm:col-span-2 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
                <dt className="app-text-muted">{t("adminLabels.fields.suspensionReason")}</dt>
                <dd className="mt-1 font-heading text-app-md font-semibold">
                  {org.suspendedReason ?? "—"}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </AdminDataPanel>

      <OrganizationDeletePanel
        organizationId={org.id}
        organizationName={org.name}
        organizationSlug={org.slug}
      />
    </div>
  );
}
