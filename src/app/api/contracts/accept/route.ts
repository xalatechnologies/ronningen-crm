import { NextResponse } from "next/server";

import { acceptContract, rateLimit, sessionTokenFromCookie } from "@/lib/contracts/guest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`accept:${ip}`, 8)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const token = await sessionTokenFromCookie();
  if (!token) return NextResponse.json({ error: "Not Found" }, { status: 404 });
  let body: {
    fullName?: string;
    termsAccepted?: boolean;
    readAccepted?: boolean;
    contentHash?: string;
    idempotencyKey?: string;
    companyAuthority?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const result = await acceptContract({
    sessionToken: token,
    fullName: body.fullName ?? "",
    termsAccepted: Boolean(body.termsAccepted),
    readAccepted: Boolean(body.readAccepted),
    contentHash: body.contentHash ?? "",
    idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
    ip,
    userAgent: request.headers.get("user-agent"),
    companyAuthority: Boolean(body.companyAuthority),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const rpc = result.result as { acceptedAt?: string } | null;
  return NextResponse.json({
    ok: true,
    result: result.result,
    acceptance: {
      fullName: (body.fullName ?? "").trim(),
      acceptedAt: rpc?.acceptedAt ?? new Date().toISOString(),
    },
  });
}
