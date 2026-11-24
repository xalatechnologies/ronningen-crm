"use client";

import Link from "next/link";

import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/features/legal/lib/legal-documents";
import { useTranslation } from "@/i18n/client";

export type AgreementFieldName = "acceptTerms" | "acceptPrivacy" | "acceptDpa";

const FIELD_BY_DOCUMENT: Record<LegalDocumentKey, AgreementFieldName> = {
  terms: "acceptTerms",
  privacy: "acceptPrivacy",
  dpa: "acceptDpa",
};

type Props = {
  values: Record<AgreementFieldName, boolean>;
  errors: Partial<Record<AgreementFieldName, string>>;
  onToggle: (field: AgreementFieldName, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
};

/** The agreements a new account must accept, each opening its own page in a new tab. */
export function AgreementsField({ values, errors, onToggle, onToggleAll }: Props) {
  const { t } = useTranslation();
  const allChecked = LEGAL_DOCUMENTS.every((d) => values[FIELD_BY_DOCUMENT[d.key]]);

  return (
    <fieldset className="space-y-4 rounded-xl border-2 border-rn-border-strong/50 bg-rn-surface-wash p-4 md:p-5">
      <legend className="sr-only">{t("auth.pages.agreements.title")}</legend>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-heading text-app-base font-semibold text-foreground" aria-hidden>
            {t("auth.pages.agreements.title")}
          </p>
          <p className="text-app-sm leading-relaxed text-muted-foreground">{t("auth.pages.agreements.intro")}</p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-app-sm font-semibold text-success">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => onToggleAll(e.target.checked)}
            className="size-4 accent-success"
          />
          {t("auth.pages.agreements.acceptAll")}
        </label>
      </div>

      <ul className="space-y-3">
        {LEGAL_DOCUMENTS.map((doc) => {
          const field = FIELD_BY_DOCUMENT[doc.key];
          const id = `agreement-${doc.key}`;
          const errorId = `${id}-error`;
          const linkName = t(`auth.pages.agreements.${doc.key}Link`);
          const [before = "", after = ""] = t(`auth.pages.agreements.${doc.key}`, { link: "{link}" }).split("{link}");
          return (
            <li key={doc.key} className="space-y-1">
              <div className="flex items-start gap-3">
                <input
                  id={id}
                  type="checkbox"
                  checked={values[field]}
                  onChange={(e) => onToggle(field, e.target.checked)}
                  aria-invalid={errors[field] ? true : undefined}
                  aria-describedby={errors[field] ? errorId : undefined}
                  className="mt-0.5 size-5 shrink-0 accent-success"
                />
                <label htmlFor={id} className="cursor-pointer text-app-base leading-snug text-foreground">
                  {before}
                  <Link
                    href={doc.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("auth.pages.agreements.linkNewTab", { name: linkName })}
                    className="font-semibold text-success underline decoration-success/40 underline-offset-4 hover:text-success/90"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {linkName}
                  </Link>
                  {after}
                </label>
              </div>
              {errors[field] ? (
                <p id={errorId} className="pl-8 text-app-sm text-destructive">
                  {errors[field]}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
