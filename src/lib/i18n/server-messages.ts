import "server-only";

import { getServerTranslation } from "@/i18n/server";

/** Server-side translator using the locale cookie (default nb). */
export async function getServerT() {
  const { t } = await getServerTranslation();
  return t;
}
