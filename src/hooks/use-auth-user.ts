"use client";

import {
  useAuthContext,
  type AuthProfile,
} from "@/providers/auth-provider";

export type { AuthProfile };

export function useAuthUser() {
  return useAuthContext();
}
