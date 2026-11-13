import { NextResponse } from "next/server";

import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Launch point of the installed app (manifest start_url): staff land in the venue app, customers in their
 * portal, anyone signed out at the login page. The destination comes from the same helper as sign-in.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = user ? await resolvePostAuthRedirect(supabase, user.id) : "/auth/login";
  return NextResponse.redirect(new URL(path, request.url));
}
