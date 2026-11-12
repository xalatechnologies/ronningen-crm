import { getInvitationPreview } from "@/lib/organizations/invitations/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { InviteAccept } from "./invite-accept";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InviteAccept
      token={token}
      signedInEmail={user?.email ?? null}
      invitation={
        preview
          ? {
              organizationName: preview.organizationName,
              inviterName: preview.inviterName,
              email: preview.email,
              role: preview.role,
              state: preview.state,
            }
          : null
      }
    />
  );
}
