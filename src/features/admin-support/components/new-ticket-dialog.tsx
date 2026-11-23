"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect, toIdNameOptions } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECT_MAX, validateTicketText } from "@/features/support/lib/ticket-input";
import { useTranslation } from "@/i18n/client";
import { createSupportTicket } from "@/lib/admin/actions/support";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; orgOptions: { id: string; name: string }[]; onCreated: (ticketId: string) => void };

/** Creates a ticket on behalf of an organization. */
export function NewTicketDialog({ open, onOpenChange, orgOptions, onCreated }: Props) {
  const { t } = useTranslation();
  const [organizationId, setOrganizationId] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const subjectError = validateTicketText({ subject, body: "xxx" });
  const ready = Boolean(organizationId) && subjectError === null;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const result = await createSupportTicket({ organizationId, subject: subject.trim() });
      if (!result.ok) {
        toast.error(t("admin.kunne_ikke_opprette_sak"), { description: result.error });
        return;
      }
      toast.success(t("admin.support_sak_opprettet"));
      setOrganizationId("");
      setSubject("");
      onOpenChange(false);
      onCreated(result.ticketId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">{t("adminLabels.sections.createSupportTicket")}</DialogTitle>
          <DialogDescription>{t("admin.inbox_new_ticket_desc")}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-org" className="text-app-xs font-semibold text-muted-foreground">
              {t("adminLabels.fields.organization")}
            </Label>
            <FormSelect
              id="support-org"
              value={organizationId}
              onValueChange={setOrganizationId}
              options={toIdNameOptions(orgOptions)}
              placeholder={t("admin.velg_organisasjon")}
              aria-label={t("admin.organisasjon_for_support_sak")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-subject" className="text-app-xs font-semibold text-muted-foreground">
              {t("adminLabels.fields.subject")}
            </Label>
            <Input id="support-subject" value={subject} maxLength={SUBJECT_MAX} placeholder={t("admin.kort_beskrivelse_av_saken")} onChange={(e) => setSubject(e.target.value)} autoFocus />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={busy || !ready}>
              {busy ? t("admin.oppretter") : t("admin.opprett_sak")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
