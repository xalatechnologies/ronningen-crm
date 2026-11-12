"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/client";
import { createTemplateFromCopy } from "@/lib/contracts/templates";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export function ContractTemplateList(props: {
  organizationId: string;
  templates: { id: string; name: string; isDefault: boolean }[];
  activeTemplateId: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      const result = await createTemplateFromCopy({
        organizationId: props.organizationId,
        sourceTemplateId: props.activeTemplateId,
        name,
      });
      if (!result.ok) {
        toast.error(
          result.error === "invalid_name"
            ? t("contracts.template.errors.invalid_name")
            : result.error,
        );
        return;
      }
      setName("");
      toast.success(t("common.toasts.created"));
      router.push(`/app/settings/kontrakter?mal=${result.templateId}#mal`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn(RN_CARD_SHELL, "space-y-3 p-5")}>
      <h2 className="font-heading text-lg font-bold">{t("contracts.template.listTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("contracts.template.listHint")}</p>
      <ul className="divide-y divide-foreground/10 text-sm">
        {props.templates.map((template) => (
          <li key={template.id} className="flex items-center justify-between gap-3 py-2">
            <span className={template.id === props.activeTemplateId ? "font-semibold" : undefined}>
              {template.name}
              {template.isDefault ? ` · ${t("contracts.template.defaultBadge")}` : ""}
            </span>
            {template.id === props.activeTemplateId ? null : (
              <Link
                className="underline"
                href={
                  template.isDefault
                    ? "/app/settings/kontrakter#mal"
                    : `/app/settings/kontrakter?mal=${template.id}#mal`
                }
              >
                {t("contracts.editStart")}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          value={name}
          placeholder={t("contracts.template.copyName")}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="button" variant="outline" disabled={busy || !name.trim()} onClick={() => void copy()}>
          {t("contracts.template.copy")}
        </Button>
      </div>
    </section>
  );
}
