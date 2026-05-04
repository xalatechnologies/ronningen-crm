import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  Coins,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Users,
  WalletCards,
} from "lucide-react";

/** Lucide icon per sidebar segment (Stitch dashboard pattern). */
export const SIDEBAR_SEGMENT_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  bookings: CalendarDays,
  overnatting: BedDouble,
  inquiries: Inbox,
  customers: Users,
  pricing: Coins,
  finance: WalletCards,
  invoices: FileText,
  assets: Package,
  reports: BarChart3,
};
