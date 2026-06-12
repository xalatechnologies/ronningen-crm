"use client";

import { AdminActionButton } from "@/components/admin/admin-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertEmailTemplate } from "@/lib/admin/actions/notifications";
import type { AdminEmailTemplate } from "@/lib/admin/queries/notifications";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type NotificationTemplateDetailPanelProps = {
  template: AdminEmailTemplate;
  onUpdated: () => void;
};

export function NotificationTemplateDetailPanel({
  template,
  onUpdated,
}: NotificationTemplateDetailPanelProps) {
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
      toast.error("Kunne ikke lagre mal", { description: result.error });
      return;
    }

    toast.success("Mal lagret", {
      description:
        "Maler sendes ikke til brukere før du oppretter en aktiv kampanje og trykker «Send til alle».",
    });
    onUpdated();
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label htmlFor={`subject-${template.key}`}>Emne</Label>
        <Input
          id={`subject-${template.key}`}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="border-2 border-rn-border-strong"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`body-${template.key}`}>HTML-innhold</Label>
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
          Forhåndsvisning
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
        {saving ? "Lagrer…" : "Lagre mal"}
      </AdminActionButton>
    </div>
  );
}
