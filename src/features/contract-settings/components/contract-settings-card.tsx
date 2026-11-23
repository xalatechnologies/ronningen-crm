"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SettingRow } from "@/features/contract-settings/components/setting-row";
import { SettingsCard } from "@/features/contract-settings/components/settings-card";
import { useTranslation } from "@/i18n/client";
import { ensureDefaultContractTemplate, setContractsPilotSettings } from "@/lib/contracts/actions";

type Props = { organizationId: string; contractsEnabled: boolean; legalApproved: boolean; hasTemplate: boolean };

/** Switches contracts on and records the approval of the terms. Saves with the same server action as before. */
export function ContractSettingsCard(props: Props) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState({ enabled: props.contractsEnabled, approved: props.legalApproved });
  const [enabled, setEnabled] = useState(props.contractsEnabled);
  const [approved, setApproved] = useState(props.legalApproved);
  const [busy, setBusy] = useState(false);
  const dirty = enabled !== saved.enabled || approved !== saved.approved;

  async function save() {
    setBusy(true);
    try {
      const result = await setContractsPilotSettings({
        organizationId: props.organizationId,
        contractsEnabled: enabled,
        approveLegalTerms: approved,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved({ enabled, approved });
      toast.success(t("common.toasts.saved"));
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      const result = await ensureDefaultContractTemplate(props.organizationId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("common.toasts.created"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title={t("contracts.sending.title")}
      description={t("contracts.sending.description")}
      dirty={dirty}
      busy={busy}
      onSave={() => void save()}
      onDiscard={() => {
        setEnabled(saved.enabled);
        setApproved(saved.approved);
      }}
      extraActions={
        !props.hasTemplate ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void seed()}>
            {t("contracts.seedTemplate")}
          </Button>
        ) : null
      }
    >
      <SettingRow title={t("contracts.enablePilot")} description={t("contracts.sending.enableHint")} checked={enabled} onCheckedChange={setEnabled} />
      <SettingRow
        title={t("contracts.approveTerms")}
        description={approved ? t("contracts.sending.approveHint") : `${t("contracts.termsNotApproved")} ${t("contracts.sending.approveHint")}`}
        checked={approved}
        onCheckedChange={setApproved}
      />
    </SettingsCard>
  );
}
