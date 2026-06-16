"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  fetchActiveOrganizationId,
  fetchUserOrganizations,
  resolveCurrentOrganization,
  setActiveOrganizationId,
} from "@/lib/organizations/organization-queries";
import {
  ACTIVE_ORGANIZATION_STORAGE_KEY,
  type OrganizationContextValue,
} from "@/lib/organizations/types";
import { isBenignSupabaseNetworkError } from "@/lib/supabase/network-errors";
import { useSupabase } from "@/providers/supabase-provider";

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);

export function OrganizationProvider({
  children,
  impersonationOrgId = null,
}: {
  children: ReactNode;
  impersonationOrgId?: string | null;
}) {
  const supabase = useSupabase();
  const { user, loading: authLoading } = useAuthUser();
  const [organizations, setOrganizations] = useState<
    OrganizationContextValue["organizations"]
  >([]);
  const [currentOrganization, setCurrentOrganization] =
    useState<OrganizationContextValue["currentOrganization"]>(null);
  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<
    string | null
  >(null);
  const [currentRole, setCurrentRole] =
    useState<OrganizationContextValue["currentRole"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setCurrentOrganizationIdState(null);
      setCurrentRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const storedOrgId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)
          : null;

      const memberships = await fetchUserOrganizations(supabase, user.id);

      let profileOrgId: string | null = null;
      try {
        profileOrgId = await fetchActiveOrganizationId(supabase, user.id);
      } catch {
        profileOrgId = null;
      }

      const preferredOrgId =
        impersonationOrgId ?? profileOrgId ?? storedOrgId;
      const resolved = resolveCurrentOrganization(memberships, preferredOrgId);

      setOrganizations(memberships);
      setCurrentOrganization(resolved.organization);
      setCurrentOrganizationIdState(resolved.organizationId);
      setCurrentRole(resolved.role);

      if (
        !impersonationOrgId &&
        resolved.organizationId &&
        resolved.organizationId !== profileOrgId
      ) {
        await setActiveOrganizationId(
          supabase,
          user.id,
          resolved.organizationId,
        );
      }
    } catch (err) {
      if (!isBenignSupabaseNetworkError(err)) {
        setError(
          err instanceof Error ? err.message : "Kunne ikke laste organisasjoner",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [impersonationOrgId, supabase, user]);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates context after auth resolves
    void refreshOrganizations();
  }, [authLoading, refreshOrganizations]);

  const setCurrentOrganizationId = useCallback(
    async (organizationId: string) => {
      if (!user) return;
      await setActiveOrganizationId(supabase, user.id, organizationId);
      await refreshOrganizations();
    },
    [refreshOrganizations, supabase, user],
  );

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      currentOrganization,
      currentOrganizationId,
      currentRole,
      loading: authLoading || loading,
      error,
      setCurrentOrganizationId,
      refreshOrganizations,
    }),
    [
      organizations,
      currentOrganization,
      currentOrganizationId,
      currentRole,
      authLoading,
      loading,
      error,
      setCurrentOrganizationId,
      refreshOrganizations,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error(
      "useOrganizationContext must be used within OrganizationProvider",
    );
  }
  return ctx;
}
