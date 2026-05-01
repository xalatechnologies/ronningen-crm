"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import type { UserRole } from "@/constants/roles";
import { fetchProfileRole, getRoleFromUser } from "@/lib/supabase/auth";
import { useSupabase } from "@/providers/supabase-provider";

export function useAuthUser() {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function applyUser(nextUser: User | null) {
      if (cancelled) return;
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        return;
      }
      const profileRole = await fetchProfileRole(supabase, nextUser.id);
      if (cancelled) return;
      setRole(profileRole ?? getRoleFromUser(nextUser));
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await applyUser(session?.user ?? null);
      setLoading(false);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        await applyUser(session?.user ?? null);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, role, loading, isAuthenticated: !!user };
}
