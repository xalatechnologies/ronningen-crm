import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Package,
  PieChart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const LANDING_ROUTES = {
  login: "/auth/login",
  register: "/auth/register",
  app: "/app",
} as const;

export const PROBLEM_ICONS: LucideIcon[] = [
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
];

export const FEATURE_ICONS: LucideIcon[] = [
  CalendarDays,
  Users,
  Package,
  Wallet,
  Layers,
  PieChart,
];

export const PRODUCT_PREVIEW_ICONS: LucideIcon[] = [
  CalendarDays,
  Wallet,
  BarChart3,
];

export const SCATTERED_SOURCE_KEYS = [
  "email",
  "excel",
  "notes",
  "phone",
  "calendar",
] as const;

export const SCATTERED_SOURCE_ROTATE = [
  "-rotate-2",
  "rotate-1",
  "-rotate-1",
  "rotate-2",
  "-rotate-3",
] as const;
