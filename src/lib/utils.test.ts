import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps a custom text-app size when a text colour is merged", () => {
    expect(cn("text-app-2xl", "text-rn-text-heading")).toBe("text-app-2xl text-rn-text-heading");
    expect(cn("text-app-sm font-semibold", "text-foreground")).toContain("text-app-sm");
  });

  it("still lets a later size replace an earlier one", () => {
    expect(cn("text-app-sm", "text-app-lg")).toBe("text-app-lg");
    expect(cn("text-app-sm", "text-lg")).toBe("text-lg");
  });

  it("still lets a later colour replace an earlier one", () => {
    expect(cn("text-foreground", "text-muted-foreground")).toBe("text-muted-foreground");
  });
});
