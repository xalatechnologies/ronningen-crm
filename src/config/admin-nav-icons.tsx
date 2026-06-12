import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  ScrollText,
  Search,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

export const ADMIN_NAV_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  organizations: Building2,
  subscriptions: CreditCard,
  billing: CreditCard,
  users: Users,
  revenue: TrendingUp,
  support: LifeBuoy,
  "system-health": Activity,
  audit: ScrollText,
  "feature-flags": Flag,
  notifications: Bell,
  settings: Settings,
  search: Search,
};
