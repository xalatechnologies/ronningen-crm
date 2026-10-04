import { NextResponse } from "next/server";

import { confirmOtp, sessionTokenFromCookie } from "@/lib/contracts/guest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = await sessionTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  let body: { code?: string } = {};
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const result = await confirmOtp(token, body.code ?? "");
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
