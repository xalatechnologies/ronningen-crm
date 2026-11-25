"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { markTipsSeen } from "@/features/welcome-tour/data/mark-tips-seen";
import type { TourAccountState } from "@/features/welcome-tour/lib/tour-state";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useSupabase } from "@/providers/supabase-provider";

const tourAccountKey = (userId: string) => ["welcome-tour", "account", userId] as const;

/**
 * The signed-in user's own tour state: when the account was created and whether the tour was seen.
 * Read on its own, apart from the profile shown in the header, so a problem here never breaks the header.
 */
export function useTourAccount(): {
  account: TourAccountState | null;
  /** True once the state has been read (also when the read failed, then `account` is null). */
  ready: boolean;
  /** Saves "seen" on the account and updates the local copy at once. */
  markSeen: () => Promise<void>;
} {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: tourAccountKey(userId ?? ""),
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: async (): Promise<TourAccountState | null> => {
      const { data, error } = await supabase.from("profiles").select("created_at, tips_seen_at").eq("id", userId!).maybeSingle();
      if (error || !data) return null;
      return { createdAt: data.created_at, tipsSeenAt: data.tips_seen_at };
    },
  });

  async function markSeen() {
    if (!userId) return;
    const current = queryClient.getQueryData<TourAccountState | null>(tourAccountKey(userId));
    if (current?.tipsSeenAt) return;
    if (current) queryClient.setQueryData(tourAccountKey(userId), { ...current, tipsSeenAt: new Date().toISOString() });
    await markTipsSeen();
  }

  return { account: query.data ?? null, ready: query.isSuccess, markSeen };
}
