"use client";

import { AppPageHeader } from "@/components/layout/app-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormSelect } from "@/components/ui/form-select";
import { formatNotificationCategory } from "@/lib/notifications/notification-events";
import type { NotificationCategory } from "@/lib/notifications/notification-events";
import {
  filterByCategory,
  filterByReadState,
  type UserNotificationFilter,
} from "@/lib/notifications/user-notification-filters";
import { RN_CARD_SHELL, RN_SEGMENT_CONTROL, RN_TEXT_SEGMENT } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/providers/notification-provider";
import { format, formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale/nb";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const CATEGORY_OPTIONS: { value: NotificationCategory | "all"; label: string }[] =
  [
    { value: "all", label: "Alle kategorier" },
    { value: "platform", label: "Plattform" },
    { value: "billing", label: "Abonnement" },
    { value: "booking", label: "Reservasjon" },
    { value: "inquiry", label: "Forespørsel" },
    { value: "accommodation", label: "Overnatting" },
    { value: "team", label: "Team" },
    { value: "support", label: "Support" },
  ];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const relative = formatDistanceToNow(date, { addSuffix: true, locale: nb });
  const absolute = format(date, "d. MMM yyyy, HH:mm", { locale: nb });
  return `${relative} · ${absolute}`;
}

function categoryBadgeClass(category: string): string {
  switch (category) {
    case "billing":
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    case "booking":
    case "inquiry":
    case "accommodation":
      return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200";
    case "support":
      return "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-200";
    case "team":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
    default:
      return "border-rn-border-strong bg-muted/40 text-muted-foreground";
  }
}

function NotificationInboxSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="flex gap-4 px-4 py-4 sm:px-5">
          <div className="mt-1 size-2 shrink-0 rounded-full bg-muted animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded bg-muted animate-pulse" />
            <div className="h-3 w-full rounded bg-muted/80 animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-muted/60 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function NotificationEmptyState({
  hasNotifications,
  readFilter,
  categoryFilter,
}: {
  hasNotifications: boolean;
  readFilter: UserNotificationFilter;
  categoryFilter: NotificationCategory | "all";
}) {
  const filteredEmpty = hasNotifications;
  const title = filteredEmpty ? "Ingen treff" : "Ingen varsler";
  const description = filteredEmpty
    ? readFilter === "unread"
      ? "Du har ingen uleste varsler med valgte filtre."
      : categoryFilter !== "all"
        ? "Prøv en annen kategori eller vis alle varsler."
        : "Ingen varsler matcher filtrene dine."
    : "Nye meldinger fra plattformen og organisasjonen vises her.";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full border-2 border-rn-border-strong bg-muted/30">
        {filteredEmpty ? (
          <Inbox className="size-6 text-muted-foreground" aria-hidden />
        ) : (
          <Bell className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <h2 className="font-heading text-app-md font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-app-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function NotificationInbox() {
  const router = useRouter();
  const { scopedNotifications, markRead, markAllRead, deleteNotification, loading } =
    useNotifications();
  const [readFilter, setReadFilter] = useState<UserNotificationFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<
    NotificationCategory | "all"
  >("all");

  const unreadTotal = useMemo(
    () => scopedNotifications.filter((n) => !n.read_at).length,
    [scopedNotifications],
  );

  const filtered = useMemo(() => {
    let rows = filterByReadState(scopedNotifications, readFilter);
    rows = filterByCategory(rows, categoryFilter);
    return rows;
  }, [scopedNotifications, readFilter, categoryFilter]);

  const hasUnread = unreadTotal > 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AppPageHeader
        title="Varsler"
        description="Meldinger fra plattformen og din organisasjon. Viktige varsler vises også som popup i appen."
        surface="card"
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !hasUnread}
            onClick={() => void markAllRead()}
          >
            <CheckCheck className="size-4" aria-hidden />
            Merk alle som lest
          </Button>
        }
        toolbar={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              className={cn(
                RN_SEGMENT_CONTROL,
                "inline-flex w-full max-w-md gap-1.5 p-1.5",
              )}
              role="group"
              aria-label="Filtrer etter lesestatus"
            >
              {(
                [
                  { value: "all" as const, label: "Alle" },
                  { value: "unread" as const, label: "Uleste" },
                ] as const
              ).map((option) => {
                const active = readFilter === option.value;
                const count =
                  option.value === "unread"
                    ? unreadTotal
                    : scopedNotifications.length;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReadFilter(option.value)}
                    className={cn(
                      RN_TEXT_SEGMENT,
                      "min-h-10 flex-1 rounded-[length:calc(var(--app-radius)-2px)] px-3 py-2 transition-colors",
                      active
                        ? "border-2 border-rn-accent-border bg-rn-surface-gradient-from font-bold text-success shadow-sm"
                        : "border-2 border-transparent font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {option.label}
                    <span className="ml-1.5 tabular-nums opacity-80">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full min-w-0 lg:w-56">
              <FormSelect
                value={categoryFilter}
                onValueChange={(value) =>
                  setCategoryFilter(value as NotificationCategory | "all")
                }
                options={CATEGORY_OPTIONS}
                aria-label="Filtrer etter kategori"
                className="min-h-10"
              />
            </div>
          </div>
        }
        toolbarClassName="pt-4"
      />

      <div className={cn(RN_CARD_SHELL, "min-w-0 overflow-hidden")}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <p className="text-app-sm text-muted-foreground">
            {loading
              ? "Laster …"
              : filtered.length === 0
                ? "0 varsler"
                : `${filtered.length} varsel${filtered.length === 1 ? "" : "er"}`}
          </p>
          {hasUnread ? (
            <Badge variant="outline" className="border-success/40 text-success">
              {unreadTotal} ulest{unreadTotal === 1 ? "" : "e"}
            </Badge>
          ) : null}
        </div>

        {loading ? (
          <NotificationInboxSkeleton />
        ) : filtered.length === 0 ? (
          <NotificationEmptyState
            hasNotifications={scopedNotifications.length > 0}
            readFilter={readFilter}
            categoryFilter={categoryFilter}
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((notification) => {
              const isUnread = !notification.read_at;

              return (
                <li
                  key={notification.id}
                  className={cn(
                    "group relative flex gap-3 px-4 py-4 transition-colors sm:gap-4 sm:px-5",
                    isUnread ? "bg-success/[0.03]" : "hover:bg-muted/20",
                  )}
                >
                  <div className="pt-1.5">
                    <span
                      className={cn(
                        "block size-2 rounded-full",
                        isUnread ? "bg-success" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={cn(
                          "font-heading text-app-sm leading-snug sm:text-app-md",
                          isUnread ? "font-semibold text-foreground" : "text-foreground",
                        )}
                      >
                        {notification.title}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal",
                          categoryBadgeClass(notification.category),
                        )}
                      >
                        {formatNotificationCategory(notification.category)}
                      </Badge>
                    </div>

                    <p className="mt-1.5 line-clamp-2 text-app-sm leading-relaxed text-muted-foreground">
                      {notification.body}
                    </p>

                    <p className="mt-2 text-app-xs text-muted-foreground">
                      {formatWhen(notification.created_at)}
                    </p>

                    {notification.action_url ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="mt-2 h-auto px-0 text-success"
                        onClick={() => {
                          void markRead(notification.id);
                          router.push(notification.action_url!);
                        }}
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        {notification.action_label ?? "Åpne"}
                      </Button>
                    ) : null}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-[length:var(--app-radius)] border-2 border-transparent text-muted-foreground outline-none transition-colors",
                        "hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-success/35",
                        "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 data-popup-open:opacity-100",
                      )}
                      aria-label="Handlinger for varsel"
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      {isUnread ? (
                        <DropdownMenuItem
                          onSelect={() => void markRead(notification.id)}
                        >
                          <CheckCheck className="size-4" aria-hidden />
                          Merk som lest
                        </DropdownMenuItem>
                      ) : null}
                      {notification.action_url ? (
                        <DropdownMenuItem
                          onSelect={() => {
                            void markRead(notification.id);
                            router.push(notification.action_url!);
                          }}
                        >
                          <ExternalLink className="size-4" aria-hidden />
                          {notification.action_label ?? "Åpne"}
                        </DropdownMenuItem>
                      ) : null}
                      {(isUnread || notification.action_url) ? (
                        <DropdownMenuSeparator />
                      ) : null}
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => void deleteNotification(notification.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Slett
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
