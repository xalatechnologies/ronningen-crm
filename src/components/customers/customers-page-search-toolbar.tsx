"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RN_PAGE_SEARCH_BUTTON,
  RN_PAGE_SEARCH_FIELD_WRAP,
  RN_PAGE_SEARCH_INPUT,
  RN_PAGE_SEARCH_TOOLBAR,
} from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

export type CustomersPageSearchToolbarProps = {
  searchId: string;
  searchAriaLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  addLabel: string;
  onAdd: () => void;
  toolbarAriaLabel: string;
};

export function CustomersPageSearchToolbar({
  searchId,
  searchAriaLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  addLabel,
  onAdd,
  toolbarAriaLabel,
}: CustomersPageSearchToolbarProps) {
  return (
    <div
      className={RN_PAGE_SEARCH_TOOLBAR}
      role="search"
      aria-label={toolbarAriaLabel}
    >
      <div className={RN_PAGE_SEARCH_FIELD_WRAP}>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-rn-text-slate md:left-5"
          aria-hidden
        />
        <Input
          id={searchId}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={RN_PAGE_SEARCH_INPUT}
          aria-label={searchAriaLabel}
        />
      </div>
      <Button
        type="button"
        onClick={onAdd}
        className={cn(
          buttonVariants({ variant: "success" }),
          RN_PAGE_SEARCH_BUTTON,
        )}
      >
        <Plus className="size-5" aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
