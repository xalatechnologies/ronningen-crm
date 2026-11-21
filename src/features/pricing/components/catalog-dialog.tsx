"use client";

import dynamic from "next/dynamic";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { CatalogKind, PackageRow, ServiceRow } from "@/features/pricing/types";

// The form (react-hook-form, zod, contract templates) is only needed once a dialog opens.
const CatalogFields = dynamic(() =>
  import("@/features/pricing/components/catalog-fields").then((m) => ({ default: m.CatalogFields })),
);

export function CatalogDialog({
  kind,
  open,
  onOpenChange,
  row,
  copy = false,
}: {
  kind: CatalogKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PackageRow | ServiceRow | null;
  copy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl border border-foreground/10 sm:max-w-lg"
        showCloseButton
      >
        {open ? (
          <CatalogFields
            key={`${row?.id ?? `new-${kind}`}-${copy ? "copy" : "edit"}`}
            kind={kind}
            row={row}
            copy={copy}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
