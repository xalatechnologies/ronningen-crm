import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { contractFrom } from "@/lib/contracts/db";
import { downloadAcceptedPdfBytes } from "@/lib/contracts/jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingId = url.searchParams.get("bookingId") ?? "";
  const versionId = url.searchParams.get("versionId") ?? "";
  if (!z.string().uuid().safeParse(bookingId).success) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, organization_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return new NextResponse("Not Found", { status: 404 });

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", booking.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = member?.role;
  if (role !== "owner" && role !== "admin" && role !== "manager") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: contract } = await contractFrom(supabase, "rental_contracts")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("organization_id", booking.organization_id)
    .maybeSingle();
  if (!contract) return new NextResponse("Not Found", { status: 404 });

  const { data: versions } = await contractFrom(supabase, "rental_contract_versions")
    .select("id, status")
    .eq("contract_id", (contract as { id: string }).id)
    .order("version_number", { ascending: false });
  const list = (versions ?? []) as { id: string; status: string }[];
  const requested =
    versionId && z.string().uuid().safeParse(versionId).success
      ? list.find((row) => row.id === versionId)
      : list.find((row) => row.status === "accepted") ?? list[0];
  if (!requested || requested.status !== "accepted") {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const bytes = await downloadAcceptedPdfBytes(requested.id);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ronningen-leieavtale.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[contracts] staff pdf failed", error);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
