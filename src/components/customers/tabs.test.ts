import { describe, expect, it } from "vitest";

import {
  customersPageTabLabel,
  parseCustomersPageTab,
} from "@/components/customers/tabs";

describe("parseCustomersPageTab", () => {
  it("defaults to customers", () => {
    expect(parseCustomersPageTab(null)).toBe("customers");
    expect(parseCustomersPageTab(undefined)).toBe("customers");
    expect(parseCustomersPageTab("")).toBe("customers");
    expect(parseCustomersPageTab("invalid")).toBe("customers");
  });

  it("parses partners tab", () => {
    expect(parseCustomersPageTab("partners")).toBe("partners");
  });
});

describe("customersPageTabLabel", () => {
  it("returns Norwegian labels", () => {
    expect(customersPageTabLabel("customers")).toBe("Kunder");
    expect(customersPageTabLabel("partners")).toBe("Partnere");
  });
});
