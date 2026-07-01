"use client";

import { useTranslation } from "@/i18n/client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busy = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation();
  const resolvedConfirm = confirmLabel ?? t("common.confirm.deleteConfirm");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onOpenChange(false);
      }}
    >
      <DialogContent
        showCloseButton
        className="max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-[length:var(--app-card-padding)] shadow-xl sm:max-w-md"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="app-section-title">
            {title}
          </DialogTitle>
          <DialogDescription className="text-app-base leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="w-full border-2 border-rn-border-strong font-heading font-bold sm:w-auto"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="button"
            size="cta"
            disabled={busy}
            className="w-full border-2 border-red-200 bg-red-600 font-heading font-bold !text-white hover:bg-red-700 sm:w-auto"
            onClick={() => void onConfirm()}
          >
            {busy ? t("common.deleting") : resolvedConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
