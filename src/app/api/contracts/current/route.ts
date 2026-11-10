import { NextResponse } from "next/server";

import { loadCurrentDocument, sessionTokenFromCookie } from "@/lib/contracts/guest";

export const runtime = "nodejs";

export async function GET() {
  const token = await sessionTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const current = await loadCurrentDocument(token);
  if (!current?.version.frozen_document) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  let acceptance: { fullName: string; acceptedAt: string } | null = null;
  if (current.version.status === "accepted") {
    const { createSupabaseAdminClient } = await import("@/lib/admin/supabase-admin");
    const { contractFrom } = await import("@/lib/contracts/db");
    const admin = createSupabaseAdminClient();
    const { data } = await contractFrom(admin, "contract_acceptances")
      .select("accepted_full_name, accepted_at")
      .eq("version_id", current.version.id)
      .maybeSingle();
    if (data) {
      const row = data as { accepted_full_name: string; accepted_at: string };
      acceptance = { fullName: row.accepted_full_name, acceptedAt: row.accepted_at };
    }
  }
  return NextResponse.json(
    {
      status: current.version.status,
      processingStatus: current.version.processing_status,
      contentHash: current.version.content_hash,
      versionNumber: current.version.version_number,
      expiresAt: current.version.expires_at,
      otpVerified: current.otpVerified,
      accepted: current.version.status === "accepted",
      acceptance,
      document: current.version.frozen_document,
    },
    { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );
}
