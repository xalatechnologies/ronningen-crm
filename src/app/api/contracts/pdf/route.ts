import { NextResponse } from "next/server";

import { downloadAcceptedPdfBytes } from "@/lib/contracts/jobs";
import { loadCurrentDocument, sessionTokenFromCookie } from "@/lib/contracts/guest";

export const runtime = "nodejs";

export async function GET() {
  const token = await sessionTokenFromCookie();
  if (!token) return new NextResponse("Not Found", { status: 404 });
  const current = await loadCurrentDocument(token);
  if (!current || current.version.status !== "accepted") {
    return new NextResponse("Not Found", { status: 404 });
  }
  try {
    const bytes = await downloadAcceptedPdfBytes(current.version.id);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ronningen-leieavtale.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[contracts] guest pdf failed", error);
    return NextResponse.json({ status: "pdf_pending" }, { status: 202 });
  }
}
