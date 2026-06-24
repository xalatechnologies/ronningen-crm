export const ADMIN_SUPPORT_SEEN_COOKIE = "admin_support_seen_at";

export const adminSupportSeenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/admin",
  maxAge: 60 * 60 * 24 * 365,
};

export function isAdminSupportPath(pathname: string): boolean {
  return (
    pathname === "/admin/support" || pathname.startsWith("/admin/support/")
  );
}
