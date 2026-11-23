"use client";

import { ImageUp } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";

type Props = {
  signaturePath: string | null;
  busy: boolean;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
};

/** Shows the lessor's signature (or says the default is used) and lets the user upload or remove one. */
export function SignatureField({ signaturePath, busy, onFile, onRemove }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-app-xs font-semibold text-muted-foreground">{t("contracts.template.signature")}</p>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-foreground/25 bg-muted/20 px-4 py-4">
        <div className="flex h-14 min-w-32 items-center">
          {signaturePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/contracts/signature?path=${encodeURIComponent(signaturePath)}`}
              alt={t("contracts.template.signature")}
              className="h-14 w-auto max-w-[16rem] object-contain"
            />
          ) : (
            <span className="text-app-sm text-muted-foreground">{t("contracts.template.signatureDefault")}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            tabIndex={-1}
            disabled={busy}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <ImageUp className="size-4" aria-hidden />
            {t("contracts.template.uploadSignature")}
          </Button>
          {signaturePath ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              {t("contracts.template.signatureRemove")}
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-app-xs text-muted-foreground">{t("contracts.template.signatureHint")}</p>
    </div>
  );
}
