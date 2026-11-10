"use client";

import { Button } from "@/components/ui/button";
import { RN_PAGE_SEARCH_BUTTON, RN_PAGE_SEARCH_TOOLBAR } from "@/lib/rn-ui";
import { Plus } from "lucide-react";

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
  return (
    <div className={RN_PAGE_SEARCH_TOOLBAR} aria-label={toolbarAriaLabel}>
      <Button
        type="button"
        variant="success"
        size="cta"
        onClick={onAdd}
        className={RN_PAGE_SEARCH_BUTTON}
      >
        <Plus className="size-5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
