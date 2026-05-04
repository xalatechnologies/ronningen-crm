import type { SidebarNavItem } from "@/types/app.types";

/** Paths that never require authentication */
export const PUBLIC_ROUTE_PREFIXES = ["/"] as const;

/** Auth flows (guest-only redirects when already signed in) */
export const AUTH_ROUTE_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
] as const;

/** Application shell (requires session) */
export const PROTECTED_ROUTE_PREFIX = "/app" as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix);
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === PROTECTED_ROUTE_PREFIX ||
    pathname.startsWith(`${PROTECTED_ROUTE_PREFIX}/`)
  );
}

/** Sidebar + matching app routes */
export const SIDEBAR_ROUTES: readonly SidebarNavItem[] = [
  { title: "Oversikt", href: "/app/dashboard", segment: "dashboard" },
  { title: "Bookinger", href: "/app/bookings", segment: "bookings" },
  { title: "Overnatting", href: "/app/overnatting", segment: "overnatting" },
  { title: "Forespørsler", href: "/app/inquiries", segment: "inquiries" },
  { title: "Partnere", href: "/app/customers", segment: "customers" },
  { title: "Priser", href: "/app/pricing", segment: "pricing" },
  { title: "Finans", href: "/app/finance", segment: "finance" },
  { title: "Fakturaer", href: "/app/invoices", segment: "invoices" },
  { title: "Inventar", href: "/app/assets", segment: "assets" },
  { title: "Rapporter", href: "/app/reports", segment: "reports" },
] as const;
