import { cookies } from "next/headers";

import {
  ADMIN_SUPPORT_SEEN_COOKIE,
} from "@/lib/admin/support-nav-badge";

export async function readAdminSupportLastSeenAt(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_SUPPORT_SEEN_COOKIE)?.value;
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}
