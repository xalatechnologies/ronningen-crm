import { afterEach, describe, expect, it, vi } from "vitest";

import { contractInviteUrl, contractPublicOrigin } from "@/lib/contracts/mail";

describe("contractPublicOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers https public origin over localhost", () => {
    vi.stubEnv("CONTRACT_PUBLIC_ORIGIN", "https://eventmanager.no");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(contractPublicOrigin()).toBe("https://eventmanager.no");
    expect(contractInviteUrl("token")).toBe("https://eventmanager.no/kontrakt/token");
  });

  it("ignores http localhost even if it is the only app url until a https origin exists", () => {
    vi.stubEnv("CONTRACT_PUBLIC_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(contractPublicOrigin()).toBe("http://localhost:3000");
  });
});
