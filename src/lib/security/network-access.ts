import { APP_NAME } from "@/config/app";

function parseHostname(url: string | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function getNetworkAccessDomains() {
  const supabaseHost = parseHostname(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://eventmanager.no";
  const appHost = parseHostname(appUrl) ?? "eventmanager.no";

  return {
    appName: APP_NAME,
    appHost,
    appUrl,
    supabaseHost,
    stripeHosts: [
      "checkout.stripe.com",
      "billing.stripe.com",
      "js.stripe.com",
    ] as const,
  };
}
