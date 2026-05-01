import type { UserRole } from "@/constants/roles";

export type SidebarNavItem = {
  title: string;
  href: string;
  segment: string;
};

export type ActiveWorkspace = {
  id: string;
  label: string;
} | null;

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};
