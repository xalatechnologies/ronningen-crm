import { getPortalInvitePreview } from "@/lib/portal/invite";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { PortalInviteAccept } from "./portal-invite-accept";

export const dynamic = "force-dynamic";

export default async function PortalInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getPortalInvitePreview(token);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PortalInviteAccept
      token={token}
      signedInEmail={user?.email ?? null}
      invitation={
        preview
          ? { organizationName: preview.organizationName, email: preview.email, state: preview.state }
          : null
      }
    />
  );
}
