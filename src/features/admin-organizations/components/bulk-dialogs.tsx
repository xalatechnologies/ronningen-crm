"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";

type SuspendProps = { open: boolean; count: number; reason: string; busy: boolean; onReasonChange: (v: string) => void; onOpenChange: (open: boolean) => void; onConfirm: () => void };

/** Asks for the reason before suspending the selected organizations. */
export function SuspendDialog({ open, count, reason, busy, onReasonChange, onOpenChange, onConfirm }: SuspendProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("admin.suspend_n_organisasjoner", { count })}</DialogTitle>
          <DialogDescription className="app-text text-muted-foreground">{t("adminLabels.suspendDialogHint")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">{t("adminLabels.fields.reason")}</Label>
            <Input id="suspend-reason" value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder={t("admin.f_eks_manglende_betaling")} autoFocus />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !reason.trim()}>
              {busy ? t("admin.suspenderer") : t("admin.suspender")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TrialProps = { open: boolean; count: number; days: string; busy: boolean; onDaysChange: (v: string) => void; onOpenChange: (open: boolean) => void; onConfirm: () => void };

/** Asks how many days to add to the trial of the selected organizations. */
export function ExtendTrialDialog({ open, count, days, busy, onDaysChange, onOpenChange, onConfirm }: TrialProps) {
  const { t } = useTranslation();
  const valid = Number.isInteger(Number(days)) && Number(days) >= 1;
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("adminLabels.dialogs.extendTrial")}</DialogTitle>
          <DialogDescription className="app-text text-muted-foreground">{t("admin.utvid_proveperiode_beskrivelse", { count })}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="trial-days">{t("adminLabels.fields.dayCount")}</Label>
            <Input id="trial-days" type="number" min={1} step={1} value={days} onChange={(e) => onDaysChange(e.target.value)} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={busy || !valid}>
              {busy ? t("admin.lagrer") : t("admin.utvid_prove")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
