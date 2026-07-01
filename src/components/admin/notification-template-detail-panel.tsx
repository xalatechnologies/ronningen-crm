"use client";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertEmailTemplate } from "@/lib/admin/actions/notifications";
import type { AdminEmailTemplate } from "@/lib/admin/queries/notifications";
import { useTranslation } from "@/i18n/client";
import { formatEmailTemplateLabel } from "@/lib/notifications/default-email-templates";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type NotificationTemplateDetailPanelProps = {
  template: AdminEmailTemplate;
  onUpdated: () => void;
};

const TEMPLATE_VARIABLE_HINTS: Record<string, string> = {
  welcome: "{{name}}",
  trial_reminder: "{{name}}, {{organization}}, {{trial_end_date}}",
  payment_failed: "{{name}}, {{organization}}",
};

export function NotificationTemplateDetailPanel({
  template,
  onUpdated,
}: NotificationTemplateDetailPanelProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubject(template.subject);
    setBodyHtml(template.bodyHtml);
  }, [template.key, template.subject, template.bodyHtml]);

  const dirty =
    subject !== template.subject || bodyHtml !== template.bodyHtml;

  async function handleSave() {
    setSaving(true);
    const result = await upsertEmailTemplate({
      key: template.key,
      subject,
      bodyHtml,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(t("admin.kunne_ikke_lagre_mal"), { description: result.error });
      return;
    }

    toast.success(t("admin.mal_lagret"), {
      description: t("admin.template_save_hint"),
    });
    onUpdated();
  }

  return (
    <div className="space-y-4 p-1">
      <p className="text-app-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatEmailTemplateLabel(template.key, t)}
        </span>
        {TEMPLATE_VARIABLE_HINTS[template.key] ? (
          <>
            {" "}
            · Tilgjengelige variabler:{" "}
            <span className="font-mono text-app-xs">
              {TEMPLATE_VARIABLE_HINTS[template.key]}
            </span>
          </>
        ) : null}
      </p>
      <div className="space-y-2">
        <Label htmlFor={`subject-${template.key}`}>{t("adminLabels.fields.subject")}</Label>
        <Input
          id={`subject-${template.key}`}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="border-2 border-rn-border-strong"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`body-${template.key}`}>{t("adminLabels.fields.htmlContent")}</Label>
        <textarea
          id={`body-${template.key}`}
          value={bodyHtml}
          onChange={(event) => setBodyHtml(event.target.value)}
          rows={8}
          className="w-full rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-background px-3 py-2 font-mono text-app-sm outline-none focus-visible:border-success focus-visible:ring-2 focus-visible:ring-success/25"
        />
      </div>

      <div className="space-y-2">
        <p className="text-app-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("admin.notification_preview")}
        </p>
        <div
          className="rounded-md border border-rn-border-strong/60 bg-card p-4 text-app-sm prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>

      <AdminActionButton
        type="button"
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
      >
        {saving ? t("admin.lagrer") : t("admin.lagre_mal")}
      </AdminActionButton>
    </div>
  );
}
