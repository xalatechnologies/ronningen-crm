import { redirect } from "next/navigation";

import { adminRoutes } from "@/config/admin-routes";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBillingRedirectPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
  }
  const qs = query.toString();
  redirect(
    qs ? `${adminRoutes.subscriptions}?${qs}` : adminRoutes.subscriptions,
  );
}
