import { describe, expect, it } from "vitest";

import { pickTemplateVersionId } from "@/lib/contracts/compose";

describe("pickTemplateVersionId", () => {
  it("lets a draft follow the newest template version", () => {
    expect(
      pickTemplateVersionId({ status: "draft", pinnedVersionId: "old", latestVersionId: "new" }),
    ).toBe("new");
  });

  it("keeps a sent contract on the version it was sent with", () => {
    for (const status of ["sent", "viewed", "accepted", "cancelled", "expired"]) {
      expect(
        pickTemplateVersionId({ status, pinnedVersionId: "old", latestVersionId: "new" }),
      ).toBe("old");
    }
  });

  it("falls back to the pinned version when there is no newer one", () => {
    expect(
      pickTemplateVersionId({ status: "draft", pinnedVersionId: "old", latestVersionId: null }),
    ).toBe("old");
  });

  it("returns null when neither exists", () => {
    expect(
      pickTemplateVersionId({ status: "draft", pinnedVersionId: null, latestVersionId: null }),
    ).toBeNull();
  });
});
