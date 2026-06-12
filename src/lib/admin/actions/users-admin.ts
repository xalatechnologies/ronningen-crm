"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { adminRoutes } from "@/config/admin-routes";
import { logAdminAction } from "@/lib/admin/audit-log";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { getAppOrigin } from "@/lib/billing/constants";
import { getSupabasePublicEnvForClient } from "@/lib/supabase/public-env";

function revalidateUser(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(adminRoutes.userDetail(userId));
}

function createSupabaseAuthEmailClient() {
  const { url, key } = getSupabasePublicEnvForClient();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function disableUserAccount(userId: string) {
  const adminUser = await requirePlatformAdmin();

  if (userId === adminUser.userId) {
    return { ok: false as const, error: "Du kan ikke deaktivere din egen konto." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "user.disabled",
    targetType: "user",
    targetId: userId,
    metadata: {},
  });

  revalidateUser(userId);
  return { ok: true as const };
}

export async function enableUserAccount(userId: string) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  if (error) return { ok: false as const, error: error.message };

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "user.enabled",
    targetType: "user",
    targetId: userId,
    metadata: {},
  });

  revalidateUser(userId);
  return { ok: true as const };
}

export async function initiatePasswordReset(userId: string) {
  const adminUser = await requirePlatformAdmin();
  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email) {
    return { ok: false as const, error: "Brukeren har ingen e-post." };
  }

  const redirectTo = `${getAppOrigin()}/auth/login`;
  const emailClient = createSupabaseAuthEmailClient();
  const { error: emailError } = await emailClient.auth.resetPasswordForEmail(
    profile.email,
    { redirectTo },
  );

  if (!emailError) {
    await logAdminAction({
      actorUserId: adminUser.userId,
      action: "user.password_reset_initiated",
      targetType: "user",
      targetId: userId,
      metadata: { email: profile.email, delivery: "email" },
    });

    revalidateUser(userId);
    return {
      ok: true as const,
      method: "email" as const,
      email: profile.email,
    };
  }

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: { redirectTo },
  });

  if (linkError) {
    return { ok: false as const, error: linkError.message };
  }

  const link = data.properties?.action_link ?? null;
  if (!link) {
    return {
      ok: false as const,
      error: "Kunne ikke opprette tilbakestillingslenke.",
    };
  }

  await logAdminAction({
    actorUserId: adminUser.userId,
    action: "user.password_reset_initiated",
    targetType: "user",
    targetId: userId,
    metadata: { email: profile.email, delivery: "manual_link" },
  });

  revalidateUser(userId);
  return {
    ok: true as const,
    method: "link" as const,
    email: profile.email,
    link,
  };
}
