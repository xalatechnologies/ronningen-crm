"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseClient<Database> {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within SupabaseProvider");
  }
  return ctx;
}
