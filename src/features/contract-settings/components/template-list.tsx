"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { createTemplateFromCopy } from "@/lib/contracts/templates";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  organizationId: string;
  templates: { id: string; name: string; isDefault: boolean }[];
  activeTemplateId: string;
};

const editHref = (template: { id: string; isDefault: boolean }) =>
  template.isDefault ? "/app/settings/kontrakter#mal" : `/app/settings/kontrakter?mal=${template.id}#mal`;

/** The templates the organization has, with the selected one marked, and a form to copy it into a new variant. */
export function TemplateList({ organizationId, templates, activeTemplateId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      const result = await createTemplateFromCopy({ organizationId, sourceTemplateId: activeTemplateId, name });
      if (!result.ok) {
        toast.error(result.error === "invalid_name" ? t("contracts.template.errors.invalid_name") : result.error);
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
    <section aria-labelledby="contract-templates-title" className={cn(RN_CARD_SHELL, "flex flex-col gap-4 p-5 md:p-6")}>
      <div>
        <h2 id="contract-templates-title" className="font-heading text-lg font-semibold text-foreground">
          {t("contracts.template.listTitle")}
        </h2>
        <p className="mt-1 text-app-sm text-muted-foreground">{t("contracts.template.listHint")}</p>
      </div>

      <ul className="divide-y divide-foreground/10 overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {templates.map((template) => {
          const active = template.id === activeTemplateId;
          return (
            <li key={template.id} className={cn("flex items-center gap-3 px-4 py-3", active && "bg-muted/40")}>
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className={cn("min-w-0 flex-1 truncate", active ? "font-semibold text-foreground" : "text-foreground")}>{template.name}</span>
              {template.isDefault ? <StatusBadge tone="info" dot={false}>{t("contracts.template.defaultBadge")}</StatusBadge> : null}
              {active ? (
                <StatusBadge tone="neutral" dot={false}>{t("contracts.template.current")}</StatusBadge>
              ) : (
                <Link
                  href={editHref(template)}
                  className="rounded-sm text-app-sm font-semibold text-success underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 dark:!text-white"
                >
                  {t("contracts.editStart")}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && !busy) void copy();
        }}
      >
        <Input className="max-w-xs" value={name} maxLength={80} aria-label={t("contracts.template.copyName")} placeholder={t("contracts.template.copyName")} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="outline" disabled={busy || !name.trim()}>
          {t("contracts.template.copy")}
        </Button>
      </form>
    </section>
  );
}
