"use client";

import { LANDING_ROUTES } from "@/components/landing/landing-content";
import {
  LANDING_CONTAINER,
  LANDING_SECTION_X,
} from "@/components/landing/landing-layout";
import { APP_NAME, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from "@/config/app";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/features/legal/lib/legal-documents";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/brand-logo";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

const NAV_KEYS = [
  { key: "features" as const, hrefKey: "features" as const },
  { key: "howItWorks" as const, hrefKey: "howItWorks" as const },
  { key: "pricing" as const, hrefKey: "pricing" as const },
  { key: "faq" as const, hrefKey: "faq" as const },
];

const LEGAL_FOOTER_LABELS = {
  terms: "landing.footer.legalTerms",
  privacy: "landing.footer.legalPrivacy",
  dpa: "landing.footer.legalDpa",
} as const satisfies Record<LegalDocumentKey, string>;

const footerLinkClass =
  "font-heading text-base font-semibold text-rn-text-slate transition-colors hover:text-success";

export function LandingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  // The tagline holds a {link} marker; the link itself goes where the marker is.
  const [taglineBefore = "", taglineAfter = ""] = t("landing.footer.tagline", { link: "{link}" }).split("{link}");

  return (
    <footer
      className={cn(
        "border-t-2 border-rn-border-strong/60 bg-rn-surface-wash py-12 md:py-14",
        LANDING_SECTION_X,
      )}
    >
      <div className={cn(LANDING_CONTAINER, "flex flex-col gap-10 md:gap-12")}>
        <div className="grid gap-10 md:grid-cols-[1fr_1.7fr] lg:gap-16">
          <div className="space-y-4">
            <Link href="/" aria-label={APP_NAME} className="inline-flex">
              <BrandLockup />
            </Link>
            <p className="max-w-md text-sm leading-relaxed text-rn-text-slate md:text-base">
              {t("landing.footer.description")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10">
            <nav className="flex flex-col gap-3" aria-label={t("landing.footer.productLinksAria")}>
              <p className="font-heading text-sm font-bold tracking-wide text-rn-text-heading uppercase">
                {t("landing.footer.product")}
              </p>
              <ul className="flex flex-col gap-2.5">
                {NAV_KEYS.map((item) => (
                  <li key={item.key}>
                    <a
                      href={t(`landing.navHrefs.${item.hrefKey}`)}
                      className={footerLinkClass}
                    >
                      {t(`landing.nav.${item.key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="flex flex-col gap-3" aria-label={t("landing.footer.accountLinksAria")}>
              <p className="font-heading text-sm font-bold tracking-wide text-rn-text-heading uppercase">
                {t("landing.footer.account")}
              </p>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link href={LANDING_ROUTES.login} className={footerLinkClass}>
                    {t("landing.auth.login")}
                  </Link>
                </li>
                <li>
                  <Link href={LANDING_ROUTES.register} className={footerLinkClass}>
                    {t("landing.auth.register")}
                  </Link>
                </li>
              </ul>
            </nav>

            <nav className="flex flex-col gap-3" aria-label={t("landing.footer.legalLinksAria")}>
              <p className="font-heading text-sm font-bold tracking-wide text-rn-text-heading uppercase">
                {t("landing.footer.legal")}
              </p>
              <ul className="flex flex-col gap-2.5">
                {LEGAL_DOCUMENTS.map((doc) => (
                  <li key={doc.key}>
                    <Link href={doc.path} className={footerLinkClass}>
                      {t(LEGAL_FOOTER_LABELS[doc.key])}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="col-span-2 flex flex-col gap-3 sm:col-span-1" aria-label={t("landing.footer.contactLinksAria")}>
              <p className="font-heading text-sm font-bold tracking-wide text-rn-text-heading uppercase">
                {t("landing.footer.contact")}
              </p>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    aria-label={t("landing.footer.contactEmailAria", { email: CONTACT_EMAIL })}
                    className={cn(footerLinkClass, "inline-flex items-center gap-2")}
                  >
                    <Mail className="size-4 shrink-0" aria-hidden />
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${CONTACT_PHONE}`}
                    aria-label={t("landing.footer.contactPhoneAria", { phone: CONTACT_PHONE_DISPLAY })}
                    className={cn(footerLinkClass, "inline-flex items-center gap-2")}
                  >
                    <Phone className="size-4 shrink-0" aria-hidden />
                    {CONTACT_PHONE_DISPLAY}
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t-2 border-rn-border-strong/40 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {APP_NAME}. {t("landing.footer.rights")}
          </p>
          <p className="text-rn-text-slate">
            {taglineBefore}
            <a
              href="https://xala.no"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-rn-text-slate underline-offset-4 transition-colors hover:text-success hover:underline"
            >
              xala.no
            </a>
            {taglineAfter}
          </p>
        </div>
      </div>
    </footer>
  );
}
