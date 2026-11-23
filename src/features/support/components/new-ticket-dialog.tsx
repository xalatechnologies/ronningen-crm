"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BODY_MAX, SUBJECT_MAX, validateTicketText } from "@/features/support/lib/ticket-input";
import { useTranslation } from "@/i18n/client";
import { createOrgSupportTicket } from "@/lib/support/actions";
import { SUPPORT_TICKET_CATEGORIES, type SupportTicketCategory } from "@/lib/support/labels";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (ticketId: string) => void };

const LABEL = "text-app-xs font-semibold text-muted-foreground";

/** The form for a new ticket, in a dialog. Send stays off until the text is long enough. */
export function NewTicketDialog({ open, onOpenChange, onCreated }: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<SupportTicketCategory>("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const error = validateTicketText({ subject, body });
  const options = useMemo(() => SUPPORT_TICKET_CATEGORIES.map((value) => ({ value, label: t(`support.category.${value}`) })), [t]);

  function reset() {
    setCategory("other");
    setSubject("");
    setBody("");
    setTouched(false);
  }

  async function submit() {
    setTouched(true);
    if (error || busy) return;
    setBusy(true);
    try {
      const result = await createOrgSupportTicket({ subject, body, category });
      if (!result.ok) {
        toast.error(t("support.panel.createFailed"), { description: result.error });
        return;
      }
      toast.success(t("support.panel.ticketCreated"));
      reset();
      onOpenChange(false);
      onCreated(result.ticketId);
    } finally {
      setBusy(false);
    }
  }

  const subjectProblem = touched && (error === "subject_min" || error === "subject_max");
  const bodyProblem = touched && (error === "body_min" || error === "body_max");

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">{t("support.panel.newTicket")}</DialogTitle>
          <DialogDescription>{t("support.panel.newTicketDescription")}</DialogDescription>
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
            <Label htmlFor="support-category" className={LABEL}>
              {t("common.category")}
            </Label>
            <FormSelect id="support-category" value={category} onValueChange={(v) => setCategory(v as SupportTicketCategory)} options={options} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-subject" className={LABEL}>
              {t("support.panel.subject")}
            </Label>
            <Input
              id="support-subject"
              value={subject}
              maxLength={SUBJECT_MAX}
              aria-invalid={subjectProblem ? true : undefined}
              placeholder={t("support.panel.subjectPlaceholder")}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            />
            {subjectProblem ? <p role="alert" className="text-app-xs text-destructive">{t("support.inbox.needSubject")}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-body" className={LABEL}>
              {t("support.panel.message")}
            </Label>
            <textarea
              id="support-body"
              value={body}
              rows={6}
              maxLength={BODY_MAX}
              aria-invalid={bodyProblem ? true : undefined}
              placeholder={t("support.panel.messagePlaceholder")}
              onChange={(e) => setBody(e.target.value)}
              className="w-full resize-y rounded-xl border border-foreground/25 bg-background px-4 py-3 text-app-base outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20"
            />
            {bodyProblem ? <p role="alert" className="text-app-xs text-destructive">{t("support.inbox.needBody")}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("support.inbox.cancel")}
            </Button>
            <Button type="submit" variant="success" disabled={busy}>
              <Send className="size-4" aria-hidden />
              {busy ? t("support.panel.sending") : t("support.panel.sendTicket")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
