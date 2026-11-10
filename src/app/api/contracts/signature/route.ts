import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { isSignaturePath, signatureContentType } from "@/lib/contracts/signature";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!isSignaturePath(path)) return new NextResponse("Not Found", { status: 404 });
  const downloaded = await createSupabaseAdminClient()
    .storage.from("contract-signatures")
    .download(path);
  if (downloaded.error || !downloaded.data) return new NextResponse("Not Found", { status: 404 });
  return new NextResponse(Buffer.from(await downloaded.data.arrayBuffer()), {
    status: 200,
    headers: {
      "Content-Type": signatureContentType(path),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
