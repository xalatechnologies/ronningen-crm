"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { TermsEditor } from "@/features/contract-settings/components/terms-editor";
import { SignatureField } from "@/features/contract-settings/components/signature-field";
import {
  templateFieldsEqual,
  templateFieldsError,
  toTemplateFields,
  type TemplateFields,
} from "@/features/contract-settings/lib/template-fields";
import { useTranslation } from "@/i18n/client";
import type { TemplateInput } from "@/lib/contracts/template-schema";
import { saveTemplateVersion, uploadSignature } from "@/lib/contracts/templates";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = { organizationId: string; templateId: string; versionNumber: number; initial: TemplateInput };

const LABEL = "text-app-xs font-semibold text-muted-foreground";
const KNOWN_ERRORS = ["invalid_template", "no_template", "template_conflict", "signature_too_large", "signature_type", "invalid_name", "forbidden"] as const;

/** Edits the lease template. Saving creates a new version; sent and signed agreements are not changed. */
export function TemplateEditor({ organizationId, templateId, versionNumber, initial }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [saved, setSaved] = useState<TemplateFields>(() => toTemplateFields(initial));
  const [fields, setFields] = useState<TemplateFields>(saved);
  const [version, setVersion] = useState(versionNumber);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const dirty = !templateFieldsEqual(fields, saved);
  const problem = templateFieldsError(fields);
  const set = (patch: Partial<TemplateFields>) => setFields((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function errorText(code: string) {
    return (KNOWN_ERRORS as readonly string[]).includes(code) ? t(`contracts.template.errors.${code}` as "contracts.template.errors.forbidden") : code;
  }

  async function save() {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    try {
      const result = await saveTemplateVersion({ organizationId, templateId, ...fields });
      if (!result.ok) {
        toast.error(errorText(result.error));
        return;
      }
      setSaved(fields);
      setVersion(result.versionNumber);
      setTouched(false);
      toast.success(t("common.toasts.saved"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("organizationId", organizationId);
      form.set("file", file);
      const result = await uploadSignature(form);
      if (!result.ok) toast.error(errorText(result.error));
      else set({ signaturePath: result.path });
    } finally {
      setBusy(false);
    }
  }

  const termsError = touched && problem === "legal_terms" ? t("contracts.template.legalTermsRequired") : null;
  const declarationError = touched && problem === "declaration" ? t("contracts.template.declarationRequired") : null;

  return (
    <section id="mal" aria-labelledby="contract-template-title" className={cn(RN_CARD_SHELL, "flex flex-col gap-6 p-5 md:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="contract-template-title" className="font-heading text-lg font-semibold text-foreground">
            {t("contracts.template.title")}
          </h2>
          <p className="mt-1 text-app-sm text-muted-foreground">{t("contracts.template.hint")}</p>
        </div>
        <StatusBadge tone="neutral" dot={false}>
          {t("contracts.template.version", { n: version })}
        </StatusBadge>
      </div>

      <TermsEditor value={fields.legalTerms} onChange={(legalTerms) => set({ legalTerms })} error={termsError} />

      <div className="grid gap-5 border-t border-foreground/10 pt-6">
        <p className="font-heading text-base font-semibold text-foreground">{t("contracts.template.sectionPayment")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-payment" className={LABEL}>
            {t("contracts.template.paymentTerms")}
          </Label>
          <Textarea id="template-payment" rows={3} value={fields.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-declaration" className={LABEL}>
            {t("contracts.template.declaration")}
          </Label>
          <Textarea
            id="template-declaration"
            rows={3}
            value={fields.acceptanceDeclaration}
            aria-invalid={declarationError ? true : undefined}
            onChange={(e) => set({ acceptanceDeclaration: e.target.value })}
          />
          {declarationError ? <p role="alert" className="text-app-xs text-destructive">{declarationError}</p> : null}
        </div>
      </div>

      <div className="grid gap-5 border-t border-foreground/10 pt-6">
        <p className="font-heading text-base font-semibold text-foreground">{t("contracts.template.sectionSigning")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-closing" className={LABEL}>
              {t("contracts.template.closingLine")}
            </Label>
            <Input id="template-closing" value={fields.closingLine} onChange={(e) => set({ closingLine: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-signer" className={LABEL}>
              {t("contracts.template.signerName")}
            </Label>
            <Input id="template-signer" value={fields.signerName} onChange={(e) => set({ signerName: e.target.value })} />
          </div>
        </div>
        <SignatureField signaturePath={fields.signaturePath} busy={busy} onFile={(file) => void onFile(file)} onRemove={() => set({ signaturePath: null })} />
      </div>

      {dirty ? (
        <div
          role="region"
          aria-label={t("contracts.unsaved")}
          className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-lg ring-1 ring-foreground/15 sm:flex-row sm:items-center sm:justify-between sm:px-4"
        >
          <p className="px-1 text-app-sm font-medium text-foreground">{t("contracts.unsaved")}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setFields(saved);
                setTouched(false);
              }}
            >
              {t("contracts.discard")}
            </Button>
            <Button type="button" variant="success" disabled={busy} onClick={() => void save()} className="flex-1 sm:flex-none">
              {busy ? t("contracts.saving") : t("contracts.template.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
