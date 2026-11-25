import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/server", () => ({
  getServerTranslation: vi.fn(async () => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@/lib/admin/supabase-admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/organizations/tenant-setup-queries", () => ({
  resolvePostAuthRedirect: vi.fn(),
}));

vi.mock("@/features/legal/data/record-acceptances", () => ({
  recordAcceptances: vi.fn(),
}));

vi.mock("@/lib/auth/login-code-ip", () => ({ allowLoginCodeIp: vi.fn() }));
vi.mock("@/lib/auth/login-codes", () => ({ consumeSignupCode: vi.fn(), emailHasAccount: vi.fn() }));

import { POST } from "@/app/api/auth/register/route";
import { recordAcceptances } from "@/features/legal/data/record-acceptances";
import { createSupabaseAdminClient } from "@/lib/admin/supabase-admin";
import { allowLoginCodeIp } from "@/lib/auth/login-code-ip";
import { consumeSignupCode, emailHasAccount } from "@/lib/auth/login-codes";
import { resolvePostAuthRedirect } from "@/lib/organizations/tenant-setup-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const validBody = {
  fullName: "Test User",
  email: "test@example.com",
  password: "password1",
  confirmPassword: "password1",
  acceptTerms: true,
  acceptPrivacy: true,
  acceptDpa: true,
  code: "123456",
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

describe("POST /api/auth/register", () => {
  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: "not-json",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for validation failure", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "x" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  describe("agreements", () => {
    const createUser = vi.fn();
    const deleteUser = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      createUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      deleteUser.mockResolvedValue({ error: null });
      vi.mocked(createSupabaseAdminClient).mockReturnValue({ auth: { admin: { createUser, deleteUser } } } as never);
      vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) } } as never);
      vi.mocked(resolvePostAuthRedirect).mockResolvedValue("/app/onboarding");
      vi.mocked(recordAcceptances).mockResolvedValue(true);
      vi.mocked(allowLoginCodeIp).mockResolvedValue(true);
      vi.mocked(emailHasAccount).mockResolvedValue(false);
      vi.mocked(consumeSignupCode).mockResolvedValue(true);
    });

    it.each(["acceptTerms", "acceptPrivacy", "acceptDpa"])("rejects the signup before creating anything when %s is missing", async (field) => {
      const res = await post({ ...validBody, [field]: false });
      expect(res.status).toBe(400);
      expect(createUser).not.toHaveBeenCalled();
    });

    it("creates the account and saves the acceptances for that user", async () => {
      const res = await post(validBody);
      expect(res.status).toBe(200);
      expect(recordAcceptances).toHaveBeenCalledWith(expect.anything(), "user-1");
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("removes the new account again when the acceptances cannot be saved", async () => {
      vi.mocked(recordAcceptances).mockResolvedValue(false);
      const res = await post(validBody);
      expect(res.status).toBe(503);
      expect(deleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("e-mail proof and duplicates", () => {
    const createUser = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      createUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      vi.mocked(createSupabaseAdminClient).mockReturnValue({ auth: { admin: { createUser, deleteUser: vi.fn() } } } as never);
      vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) } } as never);
      vi.mocked(resolvePostAuthRedirect).mockResolvedValue("/app/onboarding");
      vi.mocked(recordAcceptances).mockResolvedValue(true);
      vi.mocked(allowLoginCodeIp).mockResolvedValue(true);
      vi.mocked(emailHasAccount).mockResolvedValue(false);
      vi.mocked(consumeSignupCode).mockResolvedValue(true);
    });

    it.each([undefined, "", "12345", "abcdef", "1234567"])("rejects a missing or malformed code (%s) and creates nothing", async (code) => {
      const res = await post({ ...validBody, code });
      expect(res.status).toBe(401);
      expect(consumeSignupCode).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });

    it("rejects a wrong or expired code and creates nothing", async () => {
      vi.mocked(consumeSignupCode).mockResolvedValue(false);
      const res = await post(validBody);
      expect(res.status).toBe(401);
      expect(createUser).not.toHaveBeenCalled();
    });

    it("checks the code against the normalized e-mail", async () => {
      await post({ ...validBody, email: "  Test@Example.COM " });
      expect(consumeSignupCode).toHaveBeenCalledWith("test@example.com", "123456");
    });

    it("rejects an e-mail that already has an account with 409, before spending the code", async () => {
      vi.mocked(emailHasAccount).mockResolvedValue(true);
      const res = await post(validBody);
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ exists: true });
      expect(consumeSignupCode).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });

    it("answers 429 and does nothing when the IP is over its limit", async () => {
      vi.mocked(allowLoginCodeIp).mockResolvedValue(false);
      const res = await post(validBody);
      expect(res.status).toBe(429);
      expect(consumeSignupCode).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });
  });
});
