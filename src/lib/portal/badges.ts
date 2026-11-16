import "server-only";

import { cache } from "react";

import { countUnread } from "@/lib/portal/messages";
import { countWishAttention } from "@/lib/portal/wishlist";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Unread messages and wishes needing the customer, fetched once per request even when the layout and a page both ask. */
export const getPortalBadges = cache(async function getPortalBadges(bookingId: string) {
  const supabase = await createServerSupabaseClient();
  const [unread, wishes] = await Promise.all([countUnread(supabase, bookingId, "customer"), countWishAttention(supabase, bookingId)]);
  return { unread, wishes };
});
