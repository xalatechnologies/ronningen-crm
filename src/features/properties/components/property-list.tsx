"use client";

import { Building2, MapPin, Pencil, Trash2 } from "lucide-react";

import { propertyTypeLabel, type PropertyListRow } from "@/components/properties/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

type Props = {
  properties: PropertyListRow[];
  canManage: boolean;
  onEdit: (row: PropertyListRow) => void;
  onDelete: (row: PropertyListRow) => void;
};

/** One venue per row: name and type, address, notes, and the edit/delete actions. */
export function PropertyList({ properties, canManage, onEdit, onDelete }: Props) {
  const { t } = useTranslation();

  return (
    <ul className={cn(RN_CARD_SHELL, "divide-y divide-foreground/10 overflow-hidden")}>
      {properties.map((p) => {
        const address = p.address?.trim();
        const notes = p.notes?.trim();
        const typeLabel = propertyTypeLabel(p.type, t);
        return (
          <li key={p.id} className="flex items-start gap-4 px-5 py-4 md:px-6 md:py-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
              <Building2 className="size-5" aria-hidden />
            </span>
            <div className="grid min-w-0 flex-1 gap-x-8 gap-y-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-heading text-lg leading-snug font-semibold text-foreground">{p.name}</h3>
                  {typeLabel !== "—" ? <StatusBadge tone="neutral" dot={false}>{typeLabel}</StatusBadge> : null}
                </div>
                <p className="mt-1.5 flex items-start gap-2 text-app-sm text-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className={address ? undefined : "text-muted-foreground"}>
                    {address || t("properties.notSpecified")}
                  </span>
                </p>
              </div>
              {notes ? (
                <p className="line-clamp-2 text-app-sm leading-relaxed text-muted-foreground md:pt-1">{notes}</p>
              ) : null}
            </div>
            {canManage ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-10 text-muted-foreground hover:text-foreground"
                  aria-label={t("properties.editAria", { name: p.name })}
                  onClick={() => onEdit(p)}
                >
                  <Pencil className="size-5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-10 text-muted-foreground hover:text-destructive"
                  aria-label={t("properties.deleteAria", { name: p.name })}
                  onClick={() => onDelete(p)}
                >
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
