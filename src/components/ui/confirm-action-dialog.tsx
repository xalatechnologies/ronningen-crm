"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  confirmClassName?: string;
  contentClassName?: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bekreft",
  cancelLabel = "Avbryt",
  busy = false,
  busyLabel,
  confirmClassName,
  contentClassName,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onOpenChange(false);
      }}
    >
      <DialogContent
        showCloseButton
        className={cn(
          "max-w-[calc(100%-2rem)] gap-4 rounded-md border-2 border-rn-border-strong bg-card p-[length:var(--app-card-padding)] shadow-xl sm:max-w-md",
          contentClassName,
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="app-section-title">{title}</DialogTitle>
        </DialogHeader>
        <div className="text-app-base leading-relaxed text-muted-foreground">
          {description}
        </div>
        <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="w-full border-2 border-rn-border-strong font-heading font-bold sm:w-auto"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="cta"
            disabled={busy}
            className={cn(
              "w-full font-heading font-bold sm:w-auto",
              confirmClassName ??
                "border-2 border-rn-border-strong bg-primary !text-primary-foreground hover:bg-primary/90",
            )}
            onClick={() => void onConfirm()}
          >
            {busy ? (busyLabel ?? "Lagrer…") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
