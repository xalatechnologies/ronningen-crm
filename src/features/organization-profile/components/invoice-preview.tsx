"use client";

import { FileText } from "lucide-react";

import { useTranslation } from "@/i18n/client";
import type { InvoiceIssuerDisplay } from "@/lib/organizations/organization-profile";

/** How the organization appears as the issuer on an invoice. Always drawn on a light "paper" background. */
export function InvoicePreview({ preview }: { preview: InvoiceIssuerDisplay }) {
  const { t } = useTranslation();
  return (
    <aside className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/8 md:p-6 lg:sticky lg:top-6" aria-label={t("settings.orgProfile.preview")}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">{t("settings.orgProfile.preview")}</h2>
          <p className="mt-0.5 text-app-sm text-muted-foreground">{t("settings.orgProfile.previewDescription")}</p>
        </div>
      </div>

      <div data-theme="light" className="rounded-xl bg-card p-5 text-sm text-foreground shadow-sm ring-1 ring-foreground/15">
        <p className="font-heading text-xl font-bold">{preview.name || t("settings.orgProfile.displayNameFallback")}</p>
        {preview.tagline ? <p className="mt-1 font-medium text-success">{preview.tagline}</p> : null}
        {preview.subtitle ? <p className="mt-2 text-muted-foreground">{preview.subtitle}</p> : null}
        {preview.orgNo ? <p className="mt-2">{t("invoices.orgNumberPrefix", { number: preview.orgNo })}</p> : null}
        {preview.addressLines.length > 0 ? (
          <div className="mt-2">
            {preview.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">{t("settings.orgProfile.addressNotFilled")}</p>
        )}
        {preview.contactEmail ? <p className="mt-2">{t("invoices.emailPrefix", { email: preview.contactEmail })}</p> : null}
        {preview.contactPhone ? <p>{t("invoices.phonePrefix", { phone: preview.contactPhone })}</p> : null}
        <p className="mt-4 whitespace-pre-line border-t border-foreground/15 pt-3 text-muted-foreground">{preview.bankInfo || t("settings.orgProfile.bankInfoFallback")}</p>
      </div>
    </aside>
  );
}
