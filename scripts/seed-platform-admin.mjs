/**
 * Creates or updates the platform super-admin user (admin@eventmanager.no).
 *
 * Usage:
 *   PLATFORM_ADMIN_PASSWORD='your-secure-password' npm run admin:seed
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const PLATFORM_ADMIN_EMAIL = "admin@eventmanager.no";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.PLATFORM_ADMIN_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
  );
  process.exit(1);
}

if (!password || password.length < 12) {
  console.error(
    "Set PLATFORM_ADMIN_PASSWORD (min 12 characters) when running this script.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: listData, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    throw listError;
  }

  const existing = listData.users.find(
    (user) => user.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL,
  );

  let userId;

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Updated password for ${PLATFORM_ADMIN_EMAIL}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: PLATFORM_ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Platform Admin" },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created ${PLATFORM_ADMIN_EMAIL}`);
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: PLATFORM_ADMIN_EMAIL,
      full_name: "Platform Admin",
      is_platform_admin: true,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({ is_platform_admin: true })
    .eq("id", userId);

  if (flagError) {
    throw flagError;
  }

  console.log("Platform admin profile flagged (is_platform_admin = true).");
  console.log("Sign in at /auth/login then open /admin");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
