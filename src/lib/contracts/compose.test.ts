import { describe, expect, it } from "vitest";

import { pickPackageTemplateId, pickTemplateVersionId } from "@/lib/contracts/compose";

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

describe("pickPackageTemplateId", () => {
  const templates = new Map<string, string | null>([
    ["pkg-a", "tpl-a"],
    ["pkg-b", null],
  ]);

  it("uses the template of the first package line that has a catalog id", () => {
    expect(
      pickPackageTemplateId(
        [
          { kind: "addon", catalogId: "pkg-a" },
          { kind: "package", catalogId: "pkg-a" },
        ],
        templates,
      ),
    ).toBe("tpl-a");
  });

  it("returns null when the package has no variant, no package line, or an unknown package", () => {
    expect(pickPackageTemplateId([{ kind: "package", catalogId: "pkg-b" }], templates)).toBeNull();
    expect(pickPackageTemplateId([{ kind: "addon", catalogId: "pkg-a" }], templates)).toBeNull();
    expect(pickPackageTemplateId([{ kind: "package", catalogId: "nope" }], templates)).toBeNull();
    expect(pickPackageTemplateId([{ kind: "package", catalogId: null }], templates)).toBeNull();
  });
});
