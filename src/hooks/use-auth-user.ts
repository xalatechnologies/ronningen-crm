"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { useSupabase } from "@/providers/supabase-provider";

export type AuthProfile = {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

async function fetchProfileForDisplay(
  supabase: ReturnType<typeof useSupabase>,
  userId: string,
): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    fullName: data.full_name,
    email: data.email,
    avatarUrl: data.avatar_url,
  };
}

export function useAuthUser() {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function applyUser(nextUser: User | null) {
      if (cancelled) return;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      const nextProfile = await fetchProfileForDisplay(supabase, nextUser.id);
      if (cancelled) return;
      setProfile(nextProfile);
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

  return { user, profile, loading, isAuthenticated: !!user };
}
