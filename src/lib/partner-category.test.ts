import { describe, expect, it } from "vitest";

import {
  partnerCategoryToLabel,
  partnerFormSchema,
  partnerLabelToCategory,
} from "./validations";

describe("partnerLabelToCategory", () => {
  it("maps preset labels to canonical keys (case-insensitive)", () => {
    expect(partnerLabelToCategory("Catering")).toBe("catering");
    expect(partnerLabelToCategory("dekorasjon")).toBe("decoration");
    expect(partnerLabelToCategory("RENHOLD")).toBe("cleaning");
    expect(partnerLabelToCategory("Annet")).toBe("other");
  });

  it("keeps custom categories trimmed", () => {
    expect(partnerLabelToCategory("  Blomster  ")).toBe("Blomster");
    expect(partnerLabelToCategory("DJ og lyd")).toBe("DJ og lyd");
  });

  it("maps preset keys typed directly", () => {
    expect(partnerLabelToCategory("catering")).toBe("catering");
  });
});

describe("partnerCategoryToLabel", () => {
  it("maps preset keys to Norwegian labels", () => {
    expect(partnerCategoryToLabel("catering")).toBe("Catering");
    expect(partnerCategoryToLabel("decoration")).toBe("Dekorasjon");
    expect(partnerCategoryToLabel("cleaning")).toBe("Renhold");
    expect(partnerCategoryToLabel("other")).toBe("Annet");
  });

  it("passes through custom categories unchanged", () => {
    expect(partnerCategoryToLabel("Blomster")).toBe("Blomster");
    expect(partnerCategoryToLabel("DJ og lyd")).toBe("DJ og lyd");
  });
});

describe("partnerFormSchema category", () => {
  const base = {
    name: "Test Partner AS",
    phone: "",
    email: "",
    notes: "",
  };

  it("accepts preset labels and stores canonical keys", () => {
    const result = partnerFormSchema.safeParse({
      ...base,
      category: "Dekorasjon",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("decoration");
    }
  });

  it("accepts custom categories", () => {
    const result = partnerFormSchema.safeParse({
      ...base,
      category: "Blomster",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("Blomster");
    }
  });

  it("rejects categories shorter than 2 characters", () => {
    const result = partnerFormSchema.safeParse({
      ...base,
      category: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only categories", () => {
    const result = partnerFormSchema.safeParse({
      ...base,
      category: "   ",
    });
    expect(result.success).toBe(false);
  });
});
