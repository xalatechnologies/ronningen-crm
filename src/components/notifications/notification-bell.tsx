"use client";

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
import { formatNotificationCategory } from "@/lib/notifications/notification-events";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/providers/notification-provider";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatWhen(iso: string): string {
  return format(new Date(iso), "d. MMM HH:mm", { locale: nb });
}

export function NotificationBell() {
  const router = useRouter();
  const { scopedNotifications, unreadCount, markRead, loading } =
    useNotifications();

  const preview = scopedNotifications.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "relative flex size-11 shrink-0 items-center justify-center rounded-[length:var(--app-radius)] border-2 border-transparent outline-none transition-colors",
          "hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-success/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-popup-open:bg-muted/30",
        )}
        aria-label={
          unreadCount > 0
            ? `Varsler, ${unreadCount} uleste`
            : "Varsler"
        }
        disabled={loading}
      >
        <Bell className="size-5 text-foreground" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,22rem)] rounded-[length:var(--app-radius)] border-2 border-rn-border-strong bg-popover p-2 shadow-rn-card"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 font-heading text-app-sm font-semibold">
            Varsler
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 bg-border" />
          {preview.length === 0 ? (
            <p className="px-3 py-4 text-center text-app-sm text-muted-foreground">
              Ingen varsler ennå.
            </p>
          ) : (
            preview.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer flex-col items-start gap-1 px-3 py-2.5"
                onSelect={() => {
                  void markRead(notification.id);
                  if (notification.action_url) {
                    router.push(notification.action_url);
                  } else {
                    router.push("/app/notifications");
                  }
                }}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span
                    className={cn(
                      "font-heading text-app-sm leading-snug",
                      !notification.read_at && "font-semibold",
                    )}
                  >
                    {notification.title}
                  </span>
                  {!notification.read_at ? (
                    <span
                      className="mt-1 size-2 shrink-0 rounded-full bg-success"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <span className="line-clamp-2 text-app-xs text-muted-foreground">
                  {notification.body}
                </span>
                <span className="text-app-xs text-muted-foreground">
                  {formatNotificationCategory(notification.category)} ·{" "}
                  {formatWhen(notification.created_at)}
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator className="my-1 bg-border" />
          <DropdownMenuItem
            className="justify-center px-3 py-2 font-heading text-app-sm font-semibold text-success"
            render={<Link href="/app/notifications" />}
          >
            Se alle varsler
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
