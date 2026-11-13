const PORTAL_DETAIL = /^\/app\/bookings\/[^/]+\/portal(\/|$)/;

/**
 * Whether a sidebar item is the current one. A customer's portal page lives under /app/bookings/<id>/portal
 * but belongs to Kundeportal, so Reservasjoner must not light up there.
 */
export function isNavActive(segment: string, href: string, pathname: string): boolean {
  const portalDetail = PORTAL_DETAIL.test(pathname);
  if (segment === "portal" && portalDetail) return true;
  if (segment === "bookings" && portalDetail) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
