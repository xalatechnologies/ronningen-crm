"use client";

import { useId, useState } from "react";

import { ContractTermsView } from "@/components/contracts/contract-terms-view";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StructuredTermsEditor } from "@/features/contract-settings/components/structured-terms-editor";
import { LEGAL_TERMS_MAX } from "@/features/contract-settings/lib/template-fields";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Props = { value: string; onChange: (text: string) => void; error: string | null };

const TABS = ["sections", "raw", "preview"] as const;
type Tab = (typeof TABS)[number];

/** The terms in three views of the same text: sections to edit, plain text, and how the customer sees it. */
export function TermsEditor({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("sections");
  const id = useId();
  const tabLabel: Record<Tab, string> = {
    sections: t("contracts.template.terms.tabSections"),
    raw: t("contracts.template.terms.tabRaw"),
    preview: t("contracts.template.terms.tabPreview"),
  };
  const hint = { sections: t("contracts.template.terms.sectionsHint"), raw: t("contracts.template.terms.rawHint"), preview: t("contracts.template.terms.previewHint") }[tab];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-app-xs font-semibold text-muted-foreground">{t("contracts.template.sectionTerms")}</p>
        <div role="tablist" aria-label={t("contracts.template.terms.viewsAria")} className="inline-flex rounded-xl bg-muted/50 p-1 ring-1 ring-foreground/10">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${id}-tab-${name}`}
              aria-selected={tab === name}
              aria-controls={`${id}-panel`}
              onClick={() => setTab(name)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-app-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === name ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tabLabel[name]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-app-sm text-muted-foreground">{hint}</p>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`}>
        {tab === "sections" ? <StructuredTermsEditor value={value} onChange={onChange} /> : null}
        {tab === "raw" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-legal-terms" className="sr-only">
              {t("contracts.template.sectionTerms")}
            </Label>
            <Textarea
              id="template-legal-terms"
              rows={16}
              maxLength={LEGAL_TERMS_MAX}
              value={value}
              aria-invalid={error ? true : undefined}
              aria-describedby="template-legal-terms-meta"
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        ) : null}
        {tab === "preview" ? (
          <div className="rounded-xl bg-background px-5 py-4 text-app-sm ring-1 ring-foreground/10">
            {value.trim() ? <ContractTermsView text={value.trim()} /> : <p className="text-muted-foreground">{t("contracts.template.terms.empty")}</p>}
          </div>
        ) : null}
      </div>

      <div id="template-legal-terms-meta" className="flex justify-between gap-3 text-app-xs">
        <span role={error ? "alert" : undefined} className="text-destructive">{error}</span>
        <span className="tabular-nums text-muted-foreground">{t("contracts.template.charCount", { count: value.length, max: LEGAL_TERMS_MAX })}</span>
      </div>
    </div>
  );
}
