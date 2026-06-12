import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import type { Json } from "@/types/database.types";

export async function logAdminAction(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, Json>;
}) {
  const admin = createSupabaseAdminClient();
  await admin.from("platform_audit_log").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });
}
