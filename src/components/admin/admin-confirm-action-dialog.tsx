"use client";

import { useTranslation } from "@/i18n/client";
import type { ReactNode } from "react";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AdminConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "ghost";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function AdminConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  busy = false,
  onConfirm,
}: AdminConfirmActionDialogProps) {
  const { t } = useTranslation();
  const resolvedConfirm = confirmLabel ?? t("common.actions.confirm");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="app-text text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <AdminActionButton
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("common.actions.cancel")}
          </AdminActionButton>
          <AdminActionButton
            type="button"
            variant={confirmVariant}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? t("admin.behandler") : resolvedConfirm}
          </AdminActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
