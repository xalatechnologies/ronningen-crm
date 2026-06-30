import { NextResponse } from "next/server";

import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  const redirectTo = await resolvePostAuthRedirect(supabase, user.id);
  return NextResponse.json({ redirectTo });
}
