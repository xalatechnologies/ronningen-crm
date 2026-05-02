"use client";

import { MobileNavLinks } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { APP_NAME } from "@/config/app";
import { useAuthUser } from "@/hooks/use-auth-user";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { MenuIcon, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

function initialsFromUser(email: string | undefined, metaName: unknown): string {
  if (typeof metaName === "string" && metaName.trim()) {
    const parts = metaName.trim().split(/\s+/);
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    return (a && b ? `${a}${b}` : a ?? "?").toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "?";
}

function avatarUrlFromUser(user: ReturnType<typeof useAuthUser>["user"]) {
  if (!user) return null;
  const m = user.user_metadata;
  const url = m?.avatar_url ?? m?.picture;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function HeaderAvatarOrInitials({
  avatarUrl,
  initials,
  loading,
}: {
  avatarUrl: string;
  initials: string;
  loading: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const fallback = (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-rn-border-strong bg-rn-surface-segment font-heading text-app-sm font-bold text-success"
      aria-hidden
    >
      {loading ? "…" : initials}
    </span>
  );
  if (broken) return fallback;
  return (
    <img
      src={avatarUrl}
      alt=""
      width={44}
      height={44}
      className="size-11 shrink-0 rounded-full border-2 border-rn-border-strong object-cover"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export function AppHeader({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuthUser();
  const supabase = useSupabase();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = useMemo(
    () => initialsFromUser(user?.email, user?.user_metadata?.full_name),
    [user],
  );

  const avatarUrl = useMemo(() => avatarUrlFromUser(user), [user]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-[length:var(--app-header-height)] items-center justify-between gap-[length:var(--spacing-app-gap)] border-b-2 border-rn-border-strong bg-card px-[length:var(--app-page-padding-mobile)] py-[length:calc(var(--app-card-padding)*0.65)] shadow-rn-card md:px-[length:var(--app-page-padding-tablet)] md:py-[length:calc(var(--app-card-padding)*0.75)] lg:px-[length:var(--app-page-padding-desktop)]",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
              <SheetTitle className="font-heading !text-app-md font-bold tracking-tight text-sidebar-foreground">
                {APP_NAME}
              </SheetTitle>
            </SheetHeader>
            <div className="pt-2">
              <MobileNavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        {children}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-[length:var(--app-radius)] border-2 border-transparent py-1.5 pr-1 pl-1 outline-none transition-colors",
              "hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted/30",
            )}
            disabled={loading}
            aria-label="Konto og utlogging"
          >
            {avatarUrl ? (
              <HeaderAvatarOrInitials
                key={avatarUrl}
                avatarUrl={avatarUrl}
                initials={initials}
                loading={loading}
              />
            ) : (
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-rn-border-strong bg-rn-surface-segment font-heading text-app-sm font-bold text-success"
                aria-hidden
              >
                {loading ? "…" : initials}
              </span>
            )}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground opacity-70"
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="min-w-64 max-w-[min(100vw-1.5rem,20rem)] rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-popover p-2.5 text-app-base shadow-rn-card"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2 font-heading text-app-sm font-semibold text-foreground truncate md:px-3.5 md:py-2.5 md:text-app-md">
                {user?.email ?? "Innlogget"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2 bg-border" />
              <DropdownMenuItem
                className="px-3 py-2.5 font-heading text-app-md font-bold md:px-3.5 md:py-3"
                onSelect={() => void signOut()}
              >
                Logg ut
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
