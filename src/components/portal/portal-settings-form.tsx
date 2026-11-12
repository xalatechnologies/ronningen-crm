"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/client";
import { setPortalSettings } from "@/lib/portal/actions";

export function PortalSettingsForm(props: {
  organizationId: string;
  enabled: boolean;
  autoInvite: boolean;
  guestInvites: boolean;
}) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(props.enabled);
  const [autoInvite, setAutoInvite] = useState(props.autoInvite);
  const [guestInvites, setGuestInvites] = useState(props.guestInvites);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const result = await setPortalSettings({ organizationId: props.organizationId, enabled, autoInvite, guestInvites });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("common.toasts.saved"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/8">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">{t("portal.settings.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("portal.settings.description")}</p>
      </div>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("portal.settings.enable")}
      </label>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={autoInvite}
          disabled={!enabled}
          onChange={(e) => setAutoInvite(e.target.checked)}
        />
        {t("portal.settings.autoInvite")}
      </label>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" checked={guestInvites} disabled={!enabled} onChange={(e) => setGuestInvites(e.target.checked)} />
        {t("portal.settings.guestInvites")}
      </label>
      <Button type="button" onClick={() => void save()} disabled={busy}>
        {t("common.actions.save")}
      </Button>
    </div>
  );
}
