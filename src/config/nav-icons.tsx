import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  Coins,
  FileText,
  LayoutDashboard,
  Package,
  Users,
  WalletCards,
} from "lucide-react";

/** Lucide icon per sidebar segment (Stitch dashboard pattern). */
export const SIDEBAR_SEGMENT_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  bookings: CalendarDays,
  customers: Users,
  pricing: Coins,
  finance: WalletCards,
  invoices: FileText,
  assets: Package,
  reports: BarChart3,
};
