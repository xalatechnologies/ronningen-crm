"use client";

import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/config/app";
import { RN_TEXT_NAV_LINK } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import { useState } from "react";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 md:hidden"
            aria-label="Åpne meny"
          >
            <MenuIcon className="size-6" />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="w-[min(100%,280px)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-sidebar-border px-4 py-3 text-left">
          <SheetTitle
            className={cn(
              RN_TEXT_NAV_LINK,
              "font-heading !text-app-md font-bold tracking-tight text-sidebar-foreground",
            )}
          >
            {APP_NAME} — Admin
          </SheetTitle>
        </SheetHeader>
        <nav
          className="flex flex-col gap-[length:var(--spacing-app-gap)] px-[length:calc(var(--app-card-padding)*0.35)] pt-3 pb-4 md:px-[length:calc(var(--app-card-padding)*0.45)]"
          aria-label="Mobil plattformadmin-meny"
        >
          <AdminNavLinks onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
