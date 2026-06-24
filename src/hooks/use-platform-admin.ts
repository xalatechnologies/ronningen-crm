"use client";

import { queryKeys } from "@/lib/query-keys";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useSupabase } from "@/providers/supabase-provider";
import { useQuery } from "@tanstack/react-query";

export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuthUser();
  const supabase = useSupabase();

  const { data: isPlatformAdmin = false, isLoading } = useQuery({
    queryKey: queryKeys.auth.platformAdmin(user?.id),
    enabled: !authLoading && Boolean(user && supabase),
    retry: false,
    queryFn: async () => {
      if (!user || !supabase) return false;

      try {
        const { data, error } = await supabase.rpc(
          "is_current_user_platform_admin",
        );

        if (error) return false;
        return Boolean(data);
      } catch {
        return false;
      }
    },
  });

  return { isPlatformAdmin, loading: authLoading || isLoading };
}
