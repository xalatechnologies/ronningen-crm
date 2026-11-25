import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/server", () => ({ getServerTranslation: vi.fn(async () => ({ t: (key: string) => key })) }));
vi.mock("@/lib/auth/login-code-ip", () => ({ allowLoginCodeIp: vi.fn() }));
vi.mock("@/lib/auth/login-codes", () => ({ emailHasAccount: vi.fn(), issueSignupCode: vi.fn() }));
vi.mock("@/lib/auth/mail", () => ({ sendLoginCodeEmail: vi.fn() }));

import { POST } from "@/app/api/auth/register/code/route";
import { allowLoginCodeIp } from "@/lib/auth/login-code-ip";
import { emailHasAccount, issueSignupCode } from "@/lib/auth/login-codes";
import { sendLoginCodeEmail } from "@/lib/auth/mail";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/auth/register/code", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(allowLoginCodeIp).mockResolvedValue(true);
  vi.mocked(emailHasAccount).mockResolvedValue(false);
  vi.mocked(issueSignupCode).mockResolvedValue("123456");
  vi.mocked(sendLoginCodeEmail).mockResolvedValue({ ok: true } as never);
});

describe("POST /api/auth/register/code", () => {
  it("e-mails a signup code to a new address", async () => {
    const res = await post({ email: "  Ny@Eksempel.NO " });
    expect(res.status).toBe(200);
    expect(issueSignupCode).toHaveBeenCalledWith("ny@eksempel.no");
    expect(sendLoginCodeEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ny@eksempel.no", code: "123456", purpose: "signup" }));
  });

  it.each([["not-json"], [{}], [{ email: "bad" }], [{ email: "a".repeat(260) + "@b.no" }]])("rejects an invalid request (%j) and sends nothing", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(sendLoginCodeEmail).not.toHaveBeenCalled();
  });

  it("tells the user when the e-mail already has an account, and sends nothing", async () => {
    vi.mocked(emailHasAccount).mockResolvedValue(true);
    const res = await post({ email: "finnes@eksempel.no" });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ exists: true });
    expect(issueSignupCode).not.toHaveBeenCalled();
    expect(sendLoginCodeEmail).not.toHaveBeenCalled();
  });

  it("answers 429 over the IP limit, and when too many codes were requested for the address", async () => {
    vi.mocked(allowLoginCodeIp).mockResolvedValue(false);
    expect((await post({ email: "a@eksempel.no" })).status).toBe(429);
    vi.mocked(allowLoginCodeIp).mockResolvedValue(true);
    vi.mocked(issueSignupCode).mockResolvedValue(null);
    expect((await post({ email: "a@eksempel.no" })).status).toBe(429);
    expect(sendLoginCodeEmail).not.toHaveBeenCalled();
  });

  it("answers 503 when the e-mail cannot be sent or something throws, never pretending it was sent", async () => {
    vi.mocked(sendLoginCodeEmail).mockResolvedValue({ ok: false } as never);
    expect((await post({ email: "a@eksempel.no" })).status).toBe(503);
    vi.mocked(issueSignupCode).mockRejectedValue(new Error("db down"));
    expect((await post({ email: "a@eksempel.no" })).status).toBe(503);
  });
});
