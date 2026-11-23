import { describe, expect, it } from "vitest";

import { contractReadiness } from "@/features/contract-settings/lib/contract-readiness";

const all = { contractsEnabled: true, termsApproved: true, hasTemplate: true, emailConfigured: true };

describe("contractReadiness", () => {
  it("is ready when everything is set", () => {
    expect(contractReadiness(all)).toMatchObject({ ready: true, emailMissing: false, doneCount: 4 });
  });

  it("is not ready without enabled contracts, approved terms or a template", () => {
    expect(contractReadiness({ ...all, contractsEnabled: false }).ready).toBe(false);
    expect(contractReadiness({ ...all, termsApproved: false }).ready).toBe(false);
    expect(contractReadiness({ ...all, hasTemplate: false }).ready).toBe(false);
  });

  it("stays ready without e-mail but reports it", () => {
    expect(contractReadiness({ ...all, emailConfigured: false })).toMatchObject({ ready: true, emailMissing: true, doneCount: 3 });
  });

  it("lists the steps in order with their state", () => {
    const { steps } = contractReadiness({ ...all, termsApproved: false });
    expect(steps).toEqual([
      { key: "enabled", done: true },
      { key: "terms", done: false },
      { key: "template", done: true },
      { key: "email", done: true },
    ]);
  });
});
