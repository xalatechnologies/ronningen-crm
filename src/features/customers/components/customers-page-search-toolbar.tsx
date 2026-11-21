"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RN_PAGE_SEARCH_BUTTON, RN_PAGE_SEARCH_TOOLBAR } from "@/lib/rn-ui";
import { Plus } from "lucide-react";
import { useOrganizationPermissions } from "@/hooks/use-organization-permissions";

export type CustomersPageSearchToolbarProps = {
  addLabel: string;
  onAdd: () => void;
  toolbarAriaLabel: string;
};

export function CustomersPageSearchToolbar({
  addLabel,
  onAdd,
  toolbarAriaLabel,
}: CustomersPageSearchToolbarProps) {
  const { canManageBookings } = useOrganizationPermissions();
  if (!canManageBookings) return null;
  return (
    <div className={RN_PAGE_SEARCH_TOOLBAR} aria-label={toolbarAriaLabel}>
      <Button
        type="button"
        variant="success"
        size="cta"
        onClick={onAdd}
        className={cn(RN_PAGE_SEARCH_BUTTON, "rounded-xl shadow-none")}
      >
        <Plus className="size-5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
