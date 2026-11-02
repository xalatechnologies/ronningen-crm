"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/client";
import { saveTemplateVersion, uploadSignature } from "@/lib/contracts/templates";
import type { TemplateInput } from "@/lib/contracts/template-schema";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Fields = {
  legalTerms: string;
  paymentTerms: string;
  acceptanceDeclaration: string;
  closingLine: string;
  signerName: string;
  signaturePath: string | null;
};

function toFields(input: TemplateInput): Fields {
  return {
    legalTerms: input.legalTerms,
    paymentTerms: input.paymentTerms,
    acceptanceDeclaration: input.acceptanceDeclaration,
    closingLine: input.closingLine ?? "",
    signerName: input.signerName ?? "",
    signaturePath: input.signaturePath,
  };
}

export function ContractTemplateEditor(props: {
  organizationId: string;
  versionNumber: number;
  initial: TemplateInput;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [saved, setSaved] = useState<Fields>(() => toFields(props.initial));
  const [fields, setFields] = useState<Fields>(saved);
  const [version, setVersion] = useState(props.versionNumber);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);

  const set = (patch: Partial<Fields>) => setFields((prev) => ({ ...prev, ...patch }));

  function errorText(code: string) {
    switch (code) {
      case "invalid_template":
        return t("contracts.template.errors.invalid_template");
      case "no_template":
        return t("contracts.template.errors.no_template");
      case "template_conflict":
        return t("contracts.template.errors.template_conflict");
      case "signature_too_large":
        return t("contracts.template.errors.signature_too_large");
      case "signature_type":
        return t("contracts.template.errors.signature_type");
      case "forbidden":
        return t("contracts.template.errors.forbidden");
      default:
        return code;
    }
  }

  async function save() {
    setBusy(true);
    try {
      const result = await saveTemplateVersion({
        organizationId: props.organizationId,
        ...fields,
      });
      if (!result.ok) {
        toast.error(errorText(result.error));
        return;
      }
      setSaved(fields);
      setVersion(result.versionNumber);
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
      form.set("organizationId", props.organizationId);
      form.set("file", file);
      const result = await uploadSignature(form);
      if (!result.ok) toast.error(errorText(result.error));
      else set({ signaturePath: result.path });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const label = "block space-y-1 text-sm font-medium";

  return (
    <section id="mal" className={cn(RN_CARD_SHELL, "space-y-4 p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold">{t("contracts.template.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("contracts.template.hint")}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("contracts.template.version", { n: version })}
        </p>
      </div>

      <label className={label}>
        {t("contracts.template.legalTerms")}
        <Textarea
          rows={16}
          value={fields.legalTerms}
          onChange={(e) => set({ legalTerms: e.target.value })}
        />
      </label>
      <label className={label}>
        {t("contracts.template.paymentTerms")}
        <Textarea
          rows={2}
          value={fields.paymentTerms}
          onChange={(e) => set({ paymentTerms: e.target.value })}
        />
      </label>
      <label className={label}>
        {t("contracts.template.declaration")}
        <Textarea
          rows={2}
          value={fields.acceptanceDeclaration}
          onChange={(e) => set({ acceptanceDeclaration: e.target.value })}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={label}>
          {t("contracts.template.closingLine")}
          <Input value={fields.closingLine} onChange={(e) => set({ closingLine: e.target.value })} />
        </label>
        <label className={label}>
          {t("contracts.template.signerName")}
          <Input value={fields.signerName} onChange={(e) => set({ signerName: e.target.value })} />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("contracts.template.signature")}</p>
        <div className="flex flex-wrap items-center gap-3">
          {fields.signaturePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/contracts/signature?path=${encodeURIComponent(fields.signaturePath)}`}
              alt={t("contracts.template.signature")}
              className="h-14 w-auto max-w-[16rem] object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("contracts.template.signatureDefault")}
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="text-sm"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {fields.signaturePath ? (
            <Button type="button" variant="outline" size="sm" onClick={() => set({ signaturePath: null })}>
              {t("contracts.template.signatureRemove")}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t("contracts.template.signatureHint")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || !dirty} onClick={() => void save()}>
          {t("contracts.template.save")}
        </Button>
        <Button type="button" variant="outline" disabled={busy || !dirty} onClick={() => setFields(saved)}>
          {t("contracts.editCancel")}
        </Button>
      </div>
    </section>
  );
}
