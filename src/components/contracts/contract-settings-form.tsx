"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ensureDefaultContractTemplate,
  setContractsPilotSettings,
} from "@/lib/contracts/actions";
import { useTranslation } from "@/i18n/client";

export function ContractSettingsForm(props: {
  organizationId: string;
  contractsEnabled: boolean;
  legalApproved: boolean;
  hasTemplate: boolean;
}) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(props.contractsEnabled);
  const [approved, setApproved] = useState(props.legalApproved);
  const [busy, setBusy] = useState(false);

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
    <div className="space-y-4 rounded-lg border-2 border-rn-border-strong bg-card p-5">
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        {t("contracts.enablePilot")}
      </label>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
        {t("contracts.approveTerms")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={busy}>
          {t("common.actions.save")}
        </Button>
        {!props.hasTemplate ? (
          <Button type="button" variant="outline" onClick={() => void seed()} disabled={busy}>
            {t("contracts.seedTemplate")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
