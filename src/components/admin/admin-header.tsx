"use client";

import { LanguageSwitcher } from "@/components/language/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSearchShortcut } from "@/components/admin/admin-search-shortcut";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useTranslation } from "@/i18n/client";
import { signOutToLogin } from "@/lib/auth/sign-out";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/providers/supabase-provider";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-rn-border-strong bg-rn-surface-segment font-heading text-app-xs font-bold text-success dark:!text-white md:size-10 md:text-app-sm"
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
      width={40}
      height={40}
      className="size-9 shrink-0 rounded-full border-2 border-rn-border-strong object-cover md:size-10"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export function AdminHeader({ supportOpenCount = 0 }: { supportOpenCount?: number }) {
  const { t } = useTranslation();
  const { user, loading } = useAuthUser();
  const supabase = useSupabase();

  const initials = useMemo(
    () => initialsFromUser(user?.email, user?.user_metadata?.full_name),
    [user],
  );

  const avatarUrl = useMemo(() => avatarUrlFromUser(user), [user]);

  const displayName = useMemo(() => {
    const name = user?.user_metadata?.full_name;
    if (typeof name === "string" && name.trim()) return name.trim();
    return user?.email ?? t("common.account.loggedIn");
  }, [user]);

  async function signOut() {
    await signOutToLogin(supabase);
  }

  return (
    <header
      className={cn(
        "admin-header sticky top-0 z-30 flex min-h-[length:var(--app-header-height)] items-center justify-between gap-3 border-b-2 border-rn-border-strong bg-card px-[length:var(--app-page-padding-mobile)] py-[length:calc(var(--app-card-padding)*0.65)] shadow-rn-card md:px-[length:var(--app-page-padding-tablet)] md:py-[length:calc(var(--app-card-padding)*0.75)] lg:px-[length:var(--app-page-padding-desktop)]",
      )}
    >
      <AdminSearchShortcut />

      <div className="flex min-w-0 shrink-0 items-center md:hidden">
        <AdminMobileNav supportOpenCount={supportOpenCount} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <ThemeToggle variant="header" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-[length:var(--app-radius)] border-2 border-transparent py-1 pr-1 pl-1 outline-none transition-colors",
            "hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted/30",
          )}
          disabled={loading}
          aria-label={t("common.account.menuAria")}
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
              className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-rn-border-strong bg-rn-surface-segment font-heading text-app-xs font-bold text-success dark:!text-white md:size-10 md:text-app-sm"
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
            <DropdownMenuLabel className="px-3 py-2 font-heading text-app-sm font-semibold md:px-3.5 md:py-2.5 md:text-app-md">
              <span className="block truncate">{displayName}</span>
              {user?.email && displayName !== user.email ? (
                <span className="mt-0.5 block truncate text-app-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2 bg-border" />
            <DropdownMenuItem
              className="px-3 py-2.5 font-heading text-app-md md:px-3.5 md:py-3"
              render={<Link href="/app" />}
            >
              {t("common.account.goToApp")}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-2 bg-border" />
            <LanguageSwitcher variant="menu" />
            <DropdownMenuSeparator className="my-2 bg-border" />
            <DropdownMenuItem
              className="px-3 py-2.5 font-heading text-app-md font-bold md:px-3.5 md:py-3"
              onSelect={() => void signOut()}
            >
              {t("common.account.logout")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
