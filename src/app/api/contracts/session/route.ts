import { NextResponse } from "next/server";

import { exchangeInvite, rateLimit } from "@/lib/contracts/guest";

export const runtime = "nodejs";

function notFound() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`session:${ip}`, 20)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: { token?: string } = {};
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return notFound();
  }
  const result = await exchangeInvite(body.token ?? "");
  if (!result.ok) return notFound();
  return NextResponse.json(
    { ok: true, status: result.status },
    {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
