"use client";

import {
  countUnread,
  filterNotificationsForOrg,
  type UserNotificationRow,
} from "@/lib/notifications/user-notification-filters";
import { isBenignSupabaseNetworkError } from "@/lib/supabase/network-errors";
import { useAuthContext } from "@/providers/auth-provider";
import { useCurrentOrganization } from "@/hooks/use-current-organization";
import { useSupabase } from "@/providers/supabase-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const NOTIFICATION_SELECT =
  "id, title, body, category, priority, organization_id, action_url, action_label, read_at, acknowledged_at, created_at";

const POLL_INTERVAL_MS = 60_000;

export function useUserNotifications() {
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuthContext();
  const { currentOrganizationId } = useCurrentOrganization();
  const [notifications, setNotifications] = useState<UserNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshInFlightRef = useRef(false);
  const refreshGenerationRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (refreshInFlightRef.current) {
      window.setTimeout(() => {
        if (!refreshInFlightRef.current) void refresh();
      }, 0);
      return;
    }

    refreshInFlightRef.current = true;
    const generation = ++refreshGenerationRef.current;

    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select(NOTIFICATION_SELECT)
        .order("created_at", { ascending: false })
        .limit(50);

      if (generation !== refreshGenerationRef.current) return;

      if (error) {
        if (!isBenignSupabaseNetworkError(error)) {
          console.warn("[notifications] Kunne ikke hente varsler.", error.message);
        }
        return;
      }

      setNotifications((data ?? []) as UserNotificationRow[]);
    } catch (error) {
      if (
        generation === refreshGenerationRef.current &&
        !isBenignSupabaseNetworkError(error)
      ) {
        console.warn("[notifications] Kunne ikke hente varsler.", error);
      }
    } finally {
      if (generation === refreshGenerationRef.current) {
        setLoading(false);
      }
      refreshInFlightRef.current = false;
    }
  }, [supabase, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void refresh();

    const channel = supabase
      .channel(`user-notifications-hook:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!cancelled) void refresh();
        },
      )
      .subscribe((status, err) => {
        if (
          err &&
          status !== "CLOSED" &&
          !isBenignSupabaseNetworkError(err)
        ) {
          console.warn("[notifications] Realtime-kanal feilet.", err);
        }
      });

    const pollId = window.setInterval(() => {
      if (document.visibilityState === "visible" && !cancelled) {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      refreshGenerationRef.current += 1;
      refreshInFlightRef.current = false;
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [supabase, user, authLoading, refresh]);

  const scopedNotifications = useMemo(
    () => filterNotificationsForOrg(notifications, currentOrganizationId),
    [notifications, currentOrganizationId],
  );

  const unreadCount = useMemo(
    () => countUnread(notifications, currentOrganizationId),
    [notifications, currentOrganizationId],
  );

  const acknowledge = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("user_notifications")
        .update({ acknowledged_at: now })
        .eq("id", id);

      if (error) {
        console.warn("[notifications] Kunne ikke bekrefte varsel.", error.message);
        return false;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, acknowledged_at: now } : n)),
      );
      return true;
    },
    [supabase],
  );

  const markRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("user_notifications")
        .update({ read_at: now })
        .eq("id", id);

      if (error) {
        console.warn("[notifications] Kunne ikke markere som lest.", error.message);
        return false;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)),
      );
      return true;
    },
    [supabase],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return false;
    const now = new Date().toISOString();

    const ids = scopedNotifications.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return true;

    const { error } = await supabase
      .from("user_notifications")
      .update({ read_at: now })
      .in("id", ids);

    if (error) {
      console.warn("[notifications] Kunne ikke markere alle som lest.", error.message);
      return false;
    }

    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)),
    );
    return true;
  }, [scopedNotifications, supabase, user]);

  const deleteNotification = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("user_notifications").delete().eq("id", id);

      if (error) {
        console.warn("[notifications] Kunne ikke slette varsel.", error.message);
        return false;
      }

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return true;
    },
    [supabase],
  );

  return {
    notifications,
    scopedNotifications,
    unreadCount,
    loading: loading || authLoading,
    refresh,
    acknowledge,
    markRead,
    markAllRead,
    deleteNotification,
  };
}
