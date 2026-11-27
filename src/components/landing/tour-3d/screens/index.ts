import { drawCalendar, drawInquiries } from "@/components/landing/tour-3d/screens/booking-screens";
import { drawDashboard, drawInvoices } from "@/components/landing/tour-3d/screens/money-screens";
import { drawPortal } from "@/components/landing/tour-3d/screens/portal-screen";
import type { ScreenDrawer } from "@/components/landing/tour-3d/screens/screen-types";

/** One drawer per panel, in the same order as PANEL_LAYOUT and the tour steps 1-5. */
export const SCREEN_DRAWERS: readonly ScreenDrawer[] = [drawInquiries, drawCalendar, drawInvoices, drawDashboard, drawPortal];

export { createScreenFormat } from "@/components/landing/tour-3d/screens/screen-types";
export type { DrawEnv, TourCopy } from "@/components/landing/tour-3d/screens/screen-types";
