"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSupabase } from "@/providers/supabase-provider";
import { isBenignSupabaseNetworkError } from "@/lib/supabase/network-errors";

export type AuthProfile = {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
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
      try {
        const nextProfile = await fetchProfileForDisplay(supabase, nextUser.id);
        if (!cancelled) setProfile(nextProfile);
      } catch (error) {
        if (!cancelled && !isBenignSupabaseNetworkError(error)) {
          console.warn("[auth] Kunne ikke laste profil.", error);
        }
        if (!cancelled) setProfile(null);
      }
    }

    void (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error && !isBenignSupabaseNetworkError(error)) {
          console.warn("[auth] Kunne ikke lese sesjon.", error.message);
        }
        await applyUser(session?.user ?? null);
      } catch (error) {
        if (!cancelled && !isBenignSupabaseNetworkError(error)) {
          console.warn("[auth] Kunne ikke lese sesjon.", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          await applyUser(session?.user ?? null);
        } catch (error) {
          if (!cancelled && !isBenignSupabaseNetworkError(error)) {
            console.warn("[auth] onAuthStateChange feilet.", error);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: Boolean(user),
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}
