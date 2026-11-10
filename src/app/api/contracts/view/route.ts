import { NextResponse } from "next/server";

import { recordView, sessionTokenFromCookie } from "@/lib/contracts/guest";

export const runtime = "nodejs";

export async function POST() {
  const token = await sessionTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  const result = await recordView(token);
  if (!result) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  return NextResponse.json({ ok: true, result });
}
