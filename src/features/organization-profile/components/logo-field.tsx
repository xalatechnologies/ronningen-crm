"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { FIELD_CLASS, fieldAria, ProfileField } from "@/features/organization-profile/components/profile-field";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** The logo address field with a live preview tile. An address that does not show an image gets a clear message. */
export function LogoField({ url, name, error, inputProps }: { url: string; name: string; error?: string; inputProps: UseFormRegisterReturn }) {
  const { t } = useTranslation();
  const trimmed = url.trim();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const broken = trimmed !== "" && failedUrl === trimmed;
  const hint = broken ? undefined : t("settings.orgProfile.logoHint");
  const message = error ?? (broken ? t("settings.orgProfile.logoNotImage") : undefined);

  return (
    <div className="flex items-start gap-4">
      <span
        className={cn(
          "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10",
          broken && "bg-status-warning-bg text-status-warning-text",
        )}
      >
        {trimmed && !broken && !error ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo from any https host
          <img
            key={trimmed}
            src={trimmed}
            alt={t("settings.orgProfile.logoPreviewAlt")}
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(trimmed)}
            className="size-full object-contain p-1.5"
          />
        ) : broken ? (
          <ImageOff className="size-6" aria-hidden />
        ) : (
          <span className="font-heading text-xl font-bold text-muted-foreground" aria-label={t("settings.orgProfile.logoNone")}>
            {(name.trim().charAt(0) || "?").toUpperCase()}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <ProfileField id="org-logo" label={t("settings.orgProfile.logoUrl")} hint={hint} error={message}>
          <Input
            id="org-logo"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
            className={FIELD_CLASS}
            {...fieldAria("org-logo", hint, message)}
            {...inputProps}
          />
        </ProfileField>
      </div>
    </div>
  );
}
