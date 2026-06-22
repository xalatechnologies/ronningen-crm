import { NextResponse } from "next/server";

import { mapAuthErrorToNorwegian } from "@/lib/auth/auth-error-messages";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations";

export const runtime = "nodejs";

function getAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig forespørsel." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Ugyldig skjemadata.";
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const { password, fullName } = parsed.data;

  try {
    const admin = createSupabaseAdminClient();

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError) {
      const message = mapAuthErrorToNorwegian(createError);
      const status = createError.message
        ?.toLowerCase()
        .includes("already been registered")
        ? 409
        : 400;
      return NextResponse.json({ error: message }, { status });
    }

    if (!created.user) {
      return NextResponse.json(
        { error: "Kontoen ble ikke opprettet. Prøv igjen." },
        { status: 500 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        {
          error:
            "Kontoen ble opprettet, men innlogging feilet. Prøv å logge inn manuelt.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      redirectTo: "/app/onboarding",
      origin: getAppOrigin(request),
    });
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: "Registrering er ikke tilgjengelig akkurat nå." },
      { status: 503 },
    );
  }
}
