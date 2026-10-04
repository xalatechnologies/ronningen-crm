import { NextResponse } from "next/server";

import { rateLimit, requestOtp, sessionTokenFromCookie } from "@/lib/contracts/guest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`otp-req:${ip}`, 8)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const token = await sessionTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const result = await requestOtp(token, ip);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
