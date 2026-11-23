"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SettingRow } from "@/features/contract-settings/components/setting-row";
import { SettingsCard } from "@/features/contract-settings/components/settings-card";
import { useTranslation } from "@/i18n/client";
import { setPortalSettings } from "@/lib/portal/actions";

type Props = { organizationId: string; enabled: boolean; autoInvite: boolean; guestInvites: boolean };

/** Customer portal options. The two options below the main switch can only be changed while the portal is on. */
export function PortalSettingsCard(props: Props) {
  const { t } = useTranslation();
  const initial = { enabled: props.enabled, autoInvite: props.autoInvite, guestInvites: props.guestInvites };
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = values.enabled !== saved.enabled || values.autoInvite !== saved.autoInvite || values.guestInvites !== saved.guestInvites;
  const patch = (next: Partial<typeof values>) => setValues((prev) => ({ ...prev, ...next }));

  async function save() {
    setBusy(true);
    try {
      const result = await setPortalSettings({ organizationId: props.organizationId, ...values });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(values);
      toast.success(t("common.toasts.saved"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title={t("portal.settings.title")}
      description={t("portal.settings.description")}
      dirty={dirty}
      busy={busy}
      onSave={() => void save()}
      onDiscard={() => setValues(saved)}
    >
      <SettingRow title={t("portal.settings.enable")} checked={values.enabled} onCheckedChange={(enabled) => patch({ enabled })} />
      <SettingRow
        title={t("portal.settings.autoInvite")}
        checked={values.autoInvite}
        disabled={!values.enabled}
        onCheckedChange={(autoInvite) => patch({ autoInvite })}
      />
      <SettingRow
        title={t("portal.settings.guestInvites")}
        description={!values.enabled ? t("portal.settings.dependsOn") : undefined}
        checked={values.guestInvites}
        disabled={!values.enabled}
        onCheckedChange={(guestInvites) => patch({ guestInvites })}
      />
    </SettingsCard>
  );
}
