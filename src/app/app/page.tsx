import { DashboardPageClient } from "@/components/app-pages/dashboard-page-client";

/**
 * `/app` is redirected to `/app/dashboard` in middleware (avoids Turbopack dev
 * performance.measure error from redirect() in a server component).
 * This fallback renders the dashboard if the middleware redirect is skipped.
 */
export default function AppHomePage() {
  return <DashboardPageClient />;
}
